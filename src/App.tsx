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
  securitySymbol: string;
  exchangeName: string;
  timeframe: string;
  openTimes: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];

  isLocalMinima: boolean[];
  isLocalMaxima: boolean[];
  lineOfBestFitPercentCloseSlopes: number[];

  constructor(
    securitySymbol: string,
    exchangeName: string,
    timeframe: string,
    openTimes: number[],
    opens: number[],
    highs: number[],
    lows: number[],
    closes: number[],
    volumes: number[]) {
      this.securitySymbol = securitySymbol;
      this.exchangeName = exchangeName;
      this.timeframe = timeframe;
      this.openTimes = openTimes;
      this.opens = opens;
      this.highs = highs;
      this.lows = lows;
      this.closes = closes;
      this.volumes = volumes;

      //this.isGreens = areConsecutiveBullishCandlesticks(4, this.opens, this.closes);
      this.isLocalMinima = areLocalMinima(2, this.lows);
      this.isLocalMaxima = areLocalMaxima(2, this.highs);
      this.lineOfBestFitPercentCloseSlopes = lineOfBestFitPercentCloseSlopes(this.closes, 4);
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
function strokeLine(context2d: CanvasRenderingContext2D, p1: Vector2, p2: Vector2, strokeStyle: string) {
  context2d.strokeStyle = strokeStyle;
  context2d.beginPath();
  context2d.moveTo(p1.x, p1.y);
  context2d.lineTo(p2.x, p2.y);
  context2d.stroke();
}
function strokePolyline(context2d: CanvasRenderingContext2D, points: Vector2[], strokeStyle: string) {
  if(points.length === 0) { return; }
  
  context2d.strokeStyle = strokeStyle;
  context2d.beginPath();

  for(let i = 0; i < points.length; i++) {
    const point = points[i];
    if(i > 0) {
      context2d.lineTo(point.x, point.y);
    } else {
      context2d.moveTo(point.x, point.y);
    }
  }

  context2d.stroke();
}

interface CandlestickChartProps {
  tradeAnalysis: TradeAnalysis | null;
}
class CandleStickChart extends React.Component<CandlestickChartProps, {}> {
  canvasElement: HTMLCanvasElement | null;
  context2d: CanvasRenderingContext2D | null;

  width = 800;
  height = 300;

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

  iFromRightToI(iFromRight: number): number {
    if(!this.props.tradeAnalysis) { return 0; }
    
    const rightmostCandlestickIndex = this.props.tradeAnalysis.candlestickCount - 1;
    const i = rightmostCandlestickIndex - iFromRight;

    return i;
  }
  iFromRightToColumnX(iFromRight: number): number {
    const rightmostColumnX = this.width - this.columnWidth;
    const columnX = rightmostColumnX - (iFromRight * this.columnWidth);

    return columnX;
  }
  priceToY(price: number): number {
    const priceRange = this.maxPrice - this.minPrice;
    const yPercentFromBottom = (price - this.minPrice) / priceRange;
    const yFromBottom = yPercentFromBottom * this.height;
    const yFromTop = this.height - yFromBottom;
    return yFromTop;
  }
  drawCandlestick(iFromRight: number) {
    if(!this.props.tradeAnalysis || !this.context2d) { return; }
    
    const i = this.iFromRightToI(iFromRight);
    const columnX = this.iFromRightToColumnX(iFromRight);

    const open = this.props.tradeAnalysis.opens[i];
    const high = this.props.tradeAnalysis.highs[i];
    const low = this.props.tradeAnalysis.lows[i];
    const close = this.props.tradeAnalysis.closes[i];

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
  drawToCanvas() {
    if (this.context2d === null) { return; }

    this.context2d.clearRect(0, 0, this.width, this.height);

    if (this.props.tradeAnalysis) {
      // draw candlesticks
      for (let iFromRight = 0; iFromRight < this.props.tradeAnalysis.candlestickCount; iFromRight++) {
        this.drawCandlestick(iFromRight);
      }

      // draw boolean indicators
      for (let iFromRight = 0; iFromRight < this.props.tradeAnalysis.candlestickCount; iFromRight++) {
        const i = this.iFromRightToI(iFromRight);
        const columnX = this.iFromRightToColumnX(iFromRight);

        const high = this.props.tradeAnalysis.highs[i];
        const wickTop = this.priceToY(high);

        const low = this.props.tradeAnalysis.lows[i];
        const wickBottom = this.priceToY(low);

        const circleRadius = (this.columnWidth / 2) - this.columnHorizontalPadding;
        const circleX = columnX + (this.columnWidth / 2);
        const circleYMarginFromWick = circleRadius + this.markerVerticalMargin;
        const fillStyle = "black";
        
        if (this.props.tradeAnalysis.isLocalMinima[i]) {
          const circlePos = new Vector2(circleX, wickBottom + circleYMarginFromWick);
          fillCircle(this.context2d, circlePos, circleRadius, fillStyle);
        }

        if (this.props.tradeAnalysis.isLocalMaxima[i]) {
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

  volumeToY(volume: number): number {
    const yPercentFromBottom = volume / this.maxVolume;
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

interface LineChartProps {
  values: number[];
}
class LineChart extends React.Component<LineChartProps, {}> {
  canvasElement: HTMLCanvasElement | null;
  context2d: CanvasRenderingContext2D | null;

  width = 800;
  height = 100;

  columnWidth = 15;
  columnHorizontalPadding = 1;

  markerVerticalMargin = 5;

  valueToY(value: number): number {
    const maxAbsValue = Math.max(...this.props.values.map(Math.abs));
    const minValue = -maxAbsValue;
    const maxValue = maxAbsValue;

    const valueRange = maxValue - minValue;
    const yPercentFromBottom = (value - minValue) / valueRange;
    const yFromBottom = yPercentFromBottom * this.height;
    const yFromTop = this.height - yFromBottom;

    return yFromTop;
  }
  getPolyline(): Vector2[] {
    const rightmostColumnX = this.width - this.columnWidth;
    const rightmostCandlestickIndex = this.props.values.length - 1;

    let points = new Array<Vector2>(this.props.values.length);

    for (let iFromRight = 0; iFromRight < points.length; iFromRight++) {
      const i = rightmostCandlestickIndex - iFromRight;
      const columnX = rightmostColumnX - (iFromRight * this.columnWidth);
      const value = this.props.values[i];

      const point = new Vector2(columnX + (this.columnWidth / 2), this.valueToY(value));
      points[i] = point;
    }

    return points;
  }
  drawToCanvas() {
    if (this.context2d === null) { return; }

    this.context2d.clearRect(0, 0, this.width, this.height);

    // draw x-axis
    const xAxisY = this.valueToY(0);
    strokeLine(this.context2d, new Vector2(0, xAxisY), new Vector2(this.width, xAxisY), "rgb(0, 0, 0)");

    const polyline = this.getPolyline();
    strokePolyline(this.context2d, polyline, "rgb(0, 0, 0)");
  }

  componentDidMount() {
    if (this.canvasElement === null) { return; }

    this.context2d = this.canvasElement.getContext("2d");
    if (this.context2d === null) { return; }

    this.drawToCanvas();
  }
  componentDidUpdate(prevProps: LineChartProps, prevState: {}) {
    if (this.context2d === null) { return; }
    
    this.drawToCanvas();
  }

  render() {
    return <canvas ref={domElement => this.canvasElement = domElement} width={this.width} height={this.height} />;
  }
}

class LinearLeastSquaresResult {
  m: number;
  b: number;
  r2: number;
}
function linearLeastSquares(points: Vector2[]): LinearLeastSquaresResult {
  assert(points != null);
  assert(points.length >= 2);

  let Sx = 0;
  for(let i = 0; i < points.length; i++) { Sx += points[i].x; }

  let Sy = 0;
  for (let i = 0; i < points.length; i++) { Sy += points[i].y; }

  let Sxy = 0;
  for (let i = 0; i < points.length; i++) { Sxy += (points[i].x * points[i].y); }

  let Sxx = 0;
  for (let i = 0; i < points.length; i++) { Sxx += (points[i].x * points[i].x); }

  let Syy = 0;
  for (let i = 0; i < points.length; i++) { Syy += (points[i].y * points[i].y); }

  const SxSx = Sx * Sx;
  const n = points.length;

  let regressionLine = new LinearLeastSquaresResult();
  let denominator = ((n * Sxx) - SxSx);
  regressionLine.b = ((Sy * Sxx) - (Sx * Sxy)) / denominator;
  regressionLine.m = ((n * Sxy) - (Sx * Sy)) / denominator;

  const r = ((n * Sxy) - (Sx * Sy)) / (Math.sqrt(((n * Sxx) - (Sx * Sx))) * Math.sqrt(((n * Syy) - (Sy * Sy))));

  regressionLine.r2 = r * r;

  return regressionLine;
}
function lineOfBestFitPercentCloseSlopes(closes: number[], linRegCandleCount: number): number[] {
  return closes.map((close, closeIndex) => {
    const startCandlestickIndex = Math.max(closeIndex - (linRegCandleCount - 1), 0);
    const pointCount = 1 + (closeIndex - startCandlestickIndex);

    if(pointCount < 2) { return 0; }

    let points = new Array<Vector2>(pointCount);

    for(let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      points[pointIndex] = new Vector2(pointIndex, closes[startCandlestickIndex + pointIndex]);
    }

    return linearLeastSquares(points).m / close;
  });
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
    load15MinCandlesticks("BTC", "USD", "Gemini")
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

        const isEntrySignal = tradeAnalysis.isLocalMinima[tradeAnalysis.candlestickCount - 1];
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
    const chartOf = this.state.tradeAnalysis
      ? `${this.state.tradeAnalysis.securitySymbol} ${this.state.tradeAnalysis.exchangeName} ${this.state.tradeAnalysis.timeframe}`
      : "";

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
        <div>
          {chartOf}
        </div>
        <CandleStickChart tradeAnalysis={this.state.tradeAnalysis} />
        <VolumeChart tradeAnalysis={this.state.tradeAnalysis} />
        {this.state.tradeAnalysis ? <LineChart values={this.state.tradeAnalysis.lineOfBestFitPercentCloseSlopes} /> : null}
      </div>
    );
  }
}

export default App;

// initialization
function load15MinCandlesticks(fromSymbol: string, toSymbol: string, exchangeName: string): Promise<TradeAnalysis> {
  return fetch(`https://min-api.cryptocompare.com/data/histominute?fsym=${fromSymbol}&tsym=${toSymbol}&aggregate=15&e=${exchangeName}`)
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

      return new TradeAnalysis(fromSymbol + toSymbol, exchangeName, "15m", openTimes, opens, highs, lows, closes, volumes);
    });
}