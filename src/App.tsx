import * as React from "react";
import "./App.css";

//const logo = require("./logo.svg");

function sendTextWithTwilio(accountSid: string, authToken: string, fromPhoneNumber: string, toPhoneNumber: string, message: string) {
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

function fillRect(
  context2d: CanvasRenderingContext2D,
  position: Vector2,
  width: number, height: number,
  fillStyle: string) {
    context2d.fillStyle = fillStyle;
    context2d.fillRect(position.x, position.y, width, height);
}

interface CandlestickChartProps {
  candlesticks: any
}
class CandleStickChart extends React.Component<CandlestickChartProps, {}> {
  canvasElement: HTMLCanvasElement | null;
  context2d: CanvasRenderingContext2D | null;

  width = 1280;
  height = 720;

  columnWidth = 15;
  columnHorizontalPadding = 1;

  get minPrice(): number {
    if (!this.props.candlesticks) { return 0; }
    return Math.min(...this.props.candlesticks.lows);
  }
  get maxPrice(): number {
    if (!this.props.candlesticks) { return 0; }
    return Math.max(...this.props.candlesticks.highs);
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

    if (this.props.candlesticks) {
      const rightmostColumnX = this.width - this.columnWidth;
      const rightmostCandlestickIndex = this.props.candlesticks.count - 1;
  
      const candlesticks = this.props.candlesticks;
      for (let iFromRight = 0; iFromRight < candlesticks.count; iFromRight++) {
        const i = rightmostCandlestickIndex - iFromRight;

        const columnX = rightmostColumnX - (iFromRight * this.columnWidth);

        const open = candlesticks.opens[i];
        const high = candlesticks.highs[i];
        const low = candlesticks.lows[i];
        const close = candlesticks.closes[i];

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

interface AppState {
  candlesticks: any,
  twilioAccountSid: string,
  twilioAuthToken: string,
  fromPhoneNumber: string,
  toPhoneNumber: string
}

class App extends React.Component<{}, AppState> {
  refreshCandlesticksIntervalHandle: number;
  refreshIntervalSeconds = 30;

  constructor() {
    super();

    this.state = {
      candlesticks: null,
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
  onSendTestTextClick(event: any) {
    sendTextWithTwilio(
      this.state.twilioAccountSid, this.state.twilioAuthToken,
      this.state.fromPhoneNumber, this.state.toPhoneNumber,
      "Text from CryptoWick!"
    );
  }

  reloadCandlesticks() {
    loadBtcUsd15MinGeminiCandleSticks()
    .then(candlesticks => {
      this.setState({
        candlesticks: candlesticks
      });
    });
  }

  componentDidMount() {
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

          <button onClick={onSendTestTextClick}>Send Test Text</button>
        </div>
        <CandleStickChart candlesticks={this.state.candlesticks} />
      </div>
    );
  }
}

export default App;

// initialization
function loadBtcUsd15MinGeminiCandleSticks(): Promise<any> {
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
      let times = new Array(candlestickCount);
      let opens = new Array(candlestickCount);
      let highs = new Array(candlestickCount);
      let lows = new Array(candlestickCount);
      let closes = new Array(candlestickCount);

      for (let i = 0; i < json.Data.length; i++) {
        times[i] = json.Data[i].time;
        opens[i] = json.Data[i].open;
        highs[i] = json.Data[i].high;
        lows[i] = json.Data[i].low;
        closes[i] = json.Data[i].close;
      }

      return {
        count: candlestickCount,
        times: times,
        opens: opens,
        highs: highs,
        lows: lows,
        closes: closes
      };
    });
}