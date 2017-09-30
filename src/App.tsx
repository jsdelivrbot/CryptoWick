import * as React from "react";
import "./App.css";

//const logo = require("./logo.svg");

function assert(condition: boolean) {
  if (!condition) {
    throw new Error(`Failed assertion.`);
  }
}

function sendTextWithTwilio(
  accountSid: string,
  authToken: string,
  fromPhoneNumber: string,
  toPhoneNumber: string,
  message: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages`;

  let postBody = new FormData();
  postBody.append("From", fromPhoneNumber);
  postBody.append("To", toPhoneNumber);
  postBody.append("Body", message);

  return fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(accountSid + ":" + authToken)}`
    },
    body: postBody
  });
}

class Vector2 {
  constructor(public x: number, public y: number) {}
}

class TradeAnalysis {
  openTimes: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
  isGreens: boolean[];
  isReds: boolean[];

  constructor(
    openTimes: number[],
    opens: number[],
    highs: number[],
    lows: number[],
    closes: number[],
    volumes: number[]) {
      this.openTimes = openTimes;
      this.opens = opens;
      this.highs = highs;
      this.lows = lows;
      this.closes = closes;
      this.volumes = volumes;

      //this.isGreens = areConsecutiveBullishCandlesticks(4, this.opens, this.closes);
      this.isGreens = areLocalMinima(2, this.lows);
      this.isReds = areLocalMaxima(2, this.highs);
  }

  get candlestickCount() {
    return this.opens.length;
  }
}

function arraySliceAll<T>(predicate: (x: T) => boolean, array: T[], sliceStartIndex: number, sliceLength: number) {
  assert(sliceStartIndex >= 0);
  assert((sliceStartIndex + sliceLength) <= array.length);

  for (let i = sliceStartIndex; i < (sliceStartIndex + sliceLength); i++) {
    if (!predicate(array[i])) {
      return false;
    }
  }

  return true;
}

function areConsecutiveBullishCandlesticks(windowSize: number, opens: number[], closes: number[]): boolean[] {
  assert(windowSize >= 1);
  assert(opens.length === closes.length);

  const candlestickCount = opens.length;
  let result = new Array(candlestickCount);

  for (let curI = 0; curI < candlestickCount; curI++) {
    if (curI < (windowSize - 1)) {
      result[curI] = false;
      continue;
    }

    result[curI] = true;

    for (let pastI = (curI - (windowSize - 1)); pastI <= curI; pastI++) {
      if (closes[pastI] <= opens[pastI]) {
        result[curI] = false;
        break;
      }
    }
  }

  return result;
}
function areLocalMinima(candlestickRadius: number, lows: number[]): boolean[] {
  assert(candlestickRadius >= 1);

  const windowSize = (2 * candlestickRadius) + 1;
  const maxIndex = lows.length - 1;
  return lows.map((low, index) => ((index >= candlestickRadius) && (index <= (maxIndex - candlestickRadius)))
    ? arraySliceAll(otherLow => (otherLow >= low), lows, index - candlestickRadius, windowSize)
    : false
  );
}
function areLocalMaxima(candlestickRadius: number, highs: number[]): boolean[] {
  assert(candlestickRadius >= 1);

  const windowSize = (2 * candlestickRadius) + 1;
  const maxIndex = highs.length - 1;
  return highs.map((high, index) => ((index >= candlestickRadius) && (index <= (maxIndex - candlestickRadius)))
    ? arraySliceAll(otherHigh => (otherHigh <= high), highs, index - candlestickRadius, windowSize)
    : false
  );
}

class Settings {
  constructor(
    public twilioAccountSid: string,
    public twilioAuthToken: string,
    public fromPhoneNumber: string,
    public toPhoneNumber: string) {}
}
const SETTINGS_STORAGE_KEY = "settings";
function saveSettings(settings: Settings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}
function loadSettings(): Settings | null {
  const settingsJson = localStorage.getItem("settings");

  return settingsJson ? JSON.parse(settingsJson) : null;
}

function fillRect(
  context2d: CanvasRenderingContext2D,
  position: Vector2,
  width: number, height: number,
  fillStyle: string) {
    context2d.fillStyle = fillStyle;
    context2d.fillRect(position.x, position.y, width, height);
}
function fillCircle(
  context2d: CanvasRenderingContext2D,
  position: Vector2,
  radius: number,
  fillStyle: string) {
    context2d.beginPath();
    context2d.arc(position.x, position.y, radius, 0, 2 * Math.PI);

    context2d.fillStyle = fillStyle;
    context2d.fill();
}

interface CandlestickChartProps {
  tradeAnalysis: TradeAnalysis | null;
}
class CandleStickChart extends React.Component<CandlestickChartProps, {}> {
  canvasElement: HTMLCanvasElement | null;
  context2d: CanvasRenderingContext2D | null;

  width = 800;
  height = 400;

  columnWidth = 15;
  columnHorizontalPadding = 1;

  markerVerticalMargin = 5;

  get minPrice(): number {
    if (!this.props.tradeAnalysis) { return 0; }
    return Math.min(...this.props.tradeAnalysis.lows);
  }
  get maxPrice(): number {
    if (!this.props.tradeAnalysis) { return 0; }
    return Math.max(...this.props.tradeAnalysis.highs);
  }

  priceToY(price: number) {
    const priceRange = this.maxPrice - this.minPrice;
    const yPercentFromBottom = (price - this.minPrice) / priceRange;
    const yFromBottom = yPercentFromBottom * this.height;
    const yFromTop = this.height - yFromBottom;
    return yFromTop;
  }
  drawToCanvas() {
    if (this.context2d === null) { return; }

    this.context2d.clearRect(0, 0, this.width, this.height);

    if (this.props.tradeAnalysis) {
      // draw candlesticks
      const rightmostColumnX = this.width - this.columnWidth;
      const rightmostCandlestickIndex = this.props.tradeAnalysis.candlestickCount - 1;
  
      const tradeAnalysis = this.props.tradeAnalysis;
      for (let iFromRight = 0; iFromRight < tradeAnalysis.candlestickCount; iFromRight++) {
        const i = rightmostCandlestickIndex - iFromRight;

        const columnX = rightmostColumnX - (iFromRight * this.columnWidth);

        const open = tradeAnalysis.opens[i];
        const high = tradeAnalysis.highs[i];
        const low = tradeAnalysis.lows[i];
        const close = tradeAnalysis.closes[i];

        const fillStyle = (close > open) ? "green" : "red";

        const bodyLeft = columnX + this.columnHorizontalPadding;
        const bodyRight = (columnX + this.columnWidth) - this.columnHorizontalPadding;
        const bodyWidth = bodyRight - bodyLeft;
        const bodyMaxPrice = Math.max(open, close);
        const bodyMinPrice = Math.min(open, close);
        const bodyTop = this.priceToY(bodyMaxPrice);
        const bodyBottom = this.priceToY(bodyMinPrice);
        const bodyHeight = bodyBottom - bodyTop;

        const wickLeft = columnX + (this.columnWidth / 2);
        const wickTop = this.priceToY(high);
        const wickBottom = this.priceToY(low);
        const wickHeight = wickBottom - wickTop;

        // body
        fillRect(this.context2d, new Vector2(bodyLeft, bodyTop), bodyWidth, bodyHeight, fillStyle);
        
        // wick
        fillRect(this.context2d, new Vector2(wickLeft, wickTop), 1, wickHeight, fillStyle);
      }

      // draw boolean indicators
      for (let iFromRight = 0; iFromRight < tradeAnalysis.candlestickCount; iFromRight++) {
        const i = rightmostCandlestickIndex - iFromRight;
        const columnX = rightmostColumnX - (iFromRight * this.columnWidth);

        const high = tradeAnalysis.highs[i];
        const wickTop = this.priceToY(high);

        const low = tradeAnalysis.lows[i];
        const wickBottom = this.priceToY(low);

        const circleRadius = (this.columnWidth / 2) - this.columnHorizontalPadding;
        const circleX = columnX + (this.columnWidth / 2);
        const circleYMarginFromWick = circleRadius + this.markerVerticalMargin;
        const fillStyle = "black";
        
        if (tradeAnalysis.isGreens[i]) {
          const circlePos = new Vector2(circleX, wickBottom + circleYMarginFromWick);
          fillCircle(this.context2d, circlePos, circleRadius, fillStyle);
        }

        if (tradeAnalysis.isReds[i]) {
          const circlePos = new Vector2(circleX, wickTop - circleYMarginFromWick);
          fillCircle(this.context2d, circlePos, circleRadius, fillStyle);
        }
      }
    }
  }

  componentDidMount() {
    if (this.canvasElement === null) { return; }

    this.context2d = this.canvasElement.getContext("2d");
    if (this.context2d === null) { return; }

    this.drawToCanvas();
  }
  componentDidUpdate(prevProps: CandlestickChartProps, prevState: {}) {
    if (this.context2d === null) { return; }
    
    this.drawToCanvas();
  }

  render() {
    return <canvas ref={domElement => this.canvasElement = domElement} width={this.width} height={this.height} />;
  }
}

interface VolumeChartProps {
  tradeAnalysis: TradeAnalysis | null;
}
class VolumeChart extends React.Component<VolumeChartProps, {}> {
  canvasElement: HTMLCanvasElement | null;
  context2d: CanvasRenderingContext2D | null;

  width = 800;
  height = 100;

  columnWidth = 15;
  columnHorizontalPadding = 1;

  markerVerticalMargin = 5;

  get maxVolume(): number {
    if (!this.props.tradeAnalysis) { return 0; }
    return Math.max(...this.props.tradeAnalysis.volumes);
  }

  volumeToY(price: number) {
    const yPercentFromBottom = price / this.maxVolume;
    const yFromBottom = yPercentFromBottom * this.height;
    const yFromTop = this.height - yFromBottom;
    return yFromTop;
  }
  drawToCanvas() {
    if (this.context2d === null) { return; }

    this.context2d.clearRect(0, 0, this.width, this.height);

    if (this.props.tradeAnalysis) {
      // draw candlesticks
      const rightmostColumnX = this.width - this.columnWidth;
      const rightmostCandlestickIndex = this.props.tradeAnalysis.candlestickCount - 1;
  
      const tradeAnalysis = this.props.tradeAnalysis;
      for (let iFromRight = 0; iFromRight < tradeAnalysis.candlestickCount; iFromRight++) {
        const i = rightmostCandlestickIndex - iFromRight;

        const columnX = rightmostColumnX - (iFromRight * this.columnWidth);

        const volume = tradeAnalysis.volumes[i];
        const open = tradeAnalysis.opens[i];
        const close = tradeAnalysis.closes[i];

        const fillStyle = (close > open) ? "green" : "red";

        const bodyLeft = columnX + this.columnHorizontalPadding;
        const bodyRight = (columnX + this.columnWidth) - this.columnHorizontalPadding;
        const bodyWidth = bodyRight - bodyLeft;
        const bodyTop = this.volumeToY(volume);
        const bodyBottom = this.volumeToY(0);
        const bodyHeight = bodyBottom - bodyTop;

        // body
        fillRect(this.context2d, new Vector2(bodyLeft, bodyTop), bodyWidth, bodyHeight, fillStyle);
      }
    }
  }

  componentDidMount() {
    if (this.canvasElement === null) { return; }

    this.context2d = this.canvasElement.getContext("2d");
    if (this.context2d === null) { return; }

    this.drawToCanvas();
  }
  componentDidUpdate(prevProps: VolumeChartProps, prevState: {}) {
    if (this.context2d === null) { return; }
    
    this.drawToCanvas();
  }

  render() {
    return <canvas ref={domElement => this.canvasElement = domElement} width={this.width} height={this.height} />;
  }
}

interface AppState {
  tradeAnalysis: TradeAnalysis | null;
  twilioAccountSid: string;
  twilioAuthToken: string;
  fromPhoneNumber: string;
  toPhoneNumber: string;
}

class App extends React.Component<{}, AppState> {
  refreshCandlesticksIntervalHandle: number;
  refreshIntervalSeconds = 30;

  constructor() {
    super();

    this.state = {
      tradeAnalysis: null,
      twilioAccountSid: "",
      twilioAuthToken: "",
      fromPhoneNumber: "+1",
      toPhoneNumber: "+1"
    };
  }

  onTwilioAccountSidChange(event: any) {
    this.setState({ twilioAccountSid: event.target.value });
  }
  onTwilioAuthTokenChange(event: any) {
    this.setState({ twilioAuthToken: event.target.value });
  }
  onFromPhoneNumberChange(event: any) {
    this.setState({ fromPhoneNumber: event.target.value });
  }
  onToPhoneNumberChange(event: any) {
    this.setState({ toPhoneNumber: event.target.value });
  }

  onSaveSettings(event: any) {
    const settings = new Settings(
      this.state.twilioAccountSid,
      this.state.twilioAuthToken,
      this.state.fromPhoneNumber,
      this.state.toPhoneNumber);
    
    saveSettings(settings);
  }
  onSendTestTextClick(event: any) {
    sendTextWithTwilio(
      this.state.twilioAccountSid, this.state.twilioAuthToken,
      this.state.fromPhoneNumber, this.state.toPhoneNumber,
      "Text from CryptoWick!"
    );
  }

  reloadCandlesticks() {
    loadBtcUsd15MinGeminiCandleSticks()
    .then(tradeAnalysis => {
      const lastOpenTime = this.state.tradeAnalysis
        ? this.state.tradeAnalysis.openTimes[this.state.tradeAnalysis.candlestickCount - 1]
        : null;
      const mostRecentOpenTime = tradeAnalysis.openTimes[tradeAnalysis.candlestickCount - 1];

      const isNewAnalysis = !lastOpenTime || (mostRecentOpenTime > lastOpenTime);

      if (isNewAnalysis) {
        this.setState({
          tradeAnalysis: tradeAnalysis
        });

        const isEntrySignal = tradeAnalysis.isGreens[tradeAnalysis.candlestickCount - 1];
        if (isEntrySignal && this.state.twilioAccountSid) {
          sendTextWithTwilio(
            this.state.twilioAccountSid,
            this.state.twilioAuthToken,
            this.state.fromPhoneNumber,
            this.state.toPhoneNumber,
            "Entry signal."
          );
        }
      }
    });
  }

  componentDidMount() {
    const settings = loadSettings();
    if (settings) {
      this.setState({
        twilioAccountSid: settings.twilioAccountSid,
        twilioAuthToken: settings.twilioAuthToken,
        fromPhoneNumber: settings.fromPhoneNumber,
        toPhoneNumber: settings.toPhoneNumber
      });
    }

    this.reloadCandlesticks();

    this.refreshCandlesticksIntervalHandle = setInterval(
      this.reloadCandlesticks.bind(this),
      1000 * this.refreshIntervalSeconds
    );
  }
  componentWillUnmount() {
    clearInterval(this.refreshCandlesticksIntervalHandle);
  }
  render() {
    const onTwilioAccountSidChange = this.onTwilioAccountSidChange.bind(this);
    const onTwilioAuthTokenChange = this.onTwilioAuthTokenChange.bind(this);
    const onFromPhoneNumberChange = this.onFromPhoneNumberChange.bind(this);
    const onToPhoneNumberChange = this.onToPhoneNumberChange.bind(this);
    const onSaveSettings = this.onSaveSettings.bind(this);
    const onSendTestTextClick = this.onSendTestTextClick.bind(this);

    return (
      <div className="App">
        <div>
          Twilio Account SID
          <input type="text" value={this.state.twilioAccountSid} onChange={onTwilioAccountSidChange} />

          Twilio Auth Token
          <input type="text" value={this.state.twilioAuthToken} onChange={onTwilioAuthTokenChange} />

          From
          <input type="text" value={this.state.fromPhoneNumber} onChange={onFromPhoneNumberChange} />

          To
          <input type="text" value={this.state.toPhoneNumber} onChange={onToPhoneNumberChange} />

          <button onClick={onSaveSettings}>Save Settings</button>
          <button onClick={onSendTestTextClick}>Send Test Text</button>
        </div>
        <CandleStickChart tradeAnalysis={this.state.tradeAnalysis} />
        <VolumeChart tradeAnalysis={this.state.tradeAnalysis} />
      </div>
    );
  }
}

export default App;

// initialization
function loadBtcUsd15MinGeminiCandleSticks(): Promise<TradeAnalysis> {
  return fetch("https://min-api.cryptocompare.com/data/histominute?fsym=BTC&tsym=USD&aggregate=15&e=Gemini")
    .then(response => {
      if (!response.ok) {
        console.log("Error fetching data from CryptoWatch.");
        return;
      }

      return response.json();
    }).then(json => {
      if ((json.Response !== "Success") || (json.Type < 100)) {
        console.log(`Error fetching data from CryptoWatch. Response = ${json.Response}, Type = ${json.Type}`);
      }

      const candlestickCount: number = json.Data.length;
      
      let openTimes = new Array(candlestickCount);
      let opens = new Array(candlestickCount);
      let highs = new Array(candlestickCount);
      let lows = new Array(candlestickCount);
      let closes = new Array(candlestickCount);
      let volumes = new Array(candlestickCount);

      for (let i = 0; i < json.Data.length; i++) {
        openTimes[i] = json.Data[i].time;
        opens[i] = json.Data[i].open;
        highs[i] = json.Data[i].high;
        lows[i] = json.Data[i].low;
        closes[i] = json.Data[i].close;
        volumes[i] = json.Data[i].volumefrom;
      }

      return new TradeAnalysis(openTimes, opens, highs, lows, closes, volumes);
    });
}