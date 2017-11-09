import * as React from "react";

import * as Debug from "./Debug";
import * as Utils from "./Utils";
import * as Maths from "./Maths";
import * as Graphics from "./Graphics";
import * as Gemini from "./Gemini";
import * as ArrayUtils from "./ArrayUtils";
import * as CryptoCompare from "./CryptoCompare";
import * as Sms from "./Sms";

import { TradeAnalysis } from "./TradeAnalysis";
import { TradingAlgorithmState, updateTradingAlgorithm, ALGORITHM_USD_TO_BUY } from "./TradingAlgorithm";
import { Settings, loadSettings, saveSettings } from "./Settings";
import { CandlestickChart, CandlestickMarker, CandlestickMarkerType, CandlestickMarkerPosition } from "./CandlestickChart";
import { HistogramChart } from "./HistogramChart";
import { LineChart } from "./LineChart";

import "./App.css";

//const logo = require("./logo.svg");

const ARROW_LEFT_KEY_CODE = 37;
const ARROW_RIGHT_KEY_CODE = 39;

const REFRESH_INTERVAL_IN_SECONDS = 30;

const CHART_WIDTH = 600;

let refreshCandlesticksIntervalHandle: number;

class State {
  btcTradeAnalysis: TradeAnalysis | null;
  ethTradeAnalysis: TradeAnalysis | null;
  tradingAlgoState: TradingAlgorithmState;

  usdBalance: number;
  btcBalance: number;
  ethBalance: number;

  settings: Settings;
  useFakeHistoricalTrades: boolean;
}
function getBalance(state: State, securitySymbol: string) {
  switch(securitySymbol) {
    case "BTCUSD":
      return state.btcBalance;
    case "ETHUSD":
      return state.ethBalance;
    default:
      throw new Error(`Unknown security symbol: ${securitySymbol}`)
  }
}

let state = new State();
state.tradingAlgoState = new TradingAlgorithmState();
state.settings = new Settings("", "", "", "", "", "");
state.useFakeHistoricalTrades = false;

let rerender = () => {};
let onEnterTrade = (candlestickIndex: number) => {};
let onExitTrade = (candlestickIndex: number) => {};

function initialize() {
  const settings = loadSettings();

  if(settings) {
    state.settings = settings;

    if(settings.geminiApiKey) {
      reloadGeminiBalances()
        .then(() => {
          if(settings.twilioAccountSid) {
            reloadCandlesticks();

            refreshCandlesticksIntervalHandle = window.setInterval(
              reloadCandlesticks,
              1000 * REFRESH_INTERVAL_IN_SECONDS
            );
          }
        });
    }
  }

  rerender();
}
function uninitialize() {
  clearInterval(refreshCandlesticksIntervalHandle);
}
function reloadGeminiBalances() {
  return Gemini.loadAccountBalances(state.settings.geminiApiKey, state.settings.geminiApiSecret)
    .then(json => {
      state.usdBalance = json.USD;
      state.btcBalance = json.BTC;
      state.ethBalance = json.ETH;
      
      if(state.btcBalance > 0.001) {
        state.tradingAlgoState.isInTrade = true;
      }

      rerender();
    });
}
function updateTradingAlgoWithNewTradeAnalysis(tradeAnalysis: TradeAnalysis) {
  if(!tradeAnalysis) { return; }

  const lastOpenTime = tradeAnalysis
  ? tradeAnalysis.openTimes[tradeAnalysis.candlestickCount - 1]
  : null;
  const mostRecentOpenTime = tradeAnalysis.openTimes[tradeAnalysis.candlestickCount - 1];
  const isNewAnalysis = !lastOpenTime || (mostRecentOpenTime > lastOpenTime);

  if (isNewAnalysis) {
    if(lastOpenTime === null) {
      if(state.useFakeHistoricalTrades) {
        const fakeBuyCurrency = () => Promise.resolve(true);
        const fakeSellCurrency = () => Promise.resolve(true);

        for(let i = 0; i < (tradeAnalysis.candlestickCount - 1); i++) {
          const wasInTrade = state.tradingAlgoState.isInTrade;
          updateTradingAlgorithm(state.tradingAlgoState, tradeAnalysis, i, fakeBuyCurrency, fakeSellCurrency)
            .then(() => {
              if(!wasInTrade && state.tradingAlgoState.isInTrade) { onEnterTrade(i); }
              if(wasInTrade && !state.tradingAlgoState.isInTrade) { onExitTrade(i); }
            });
        }
      }
    }

    const tryBuyCurrency = () => {
      return buyCurrency(tradeAnalysis.securitySymbol, Math.min(ALGORITHM_USD_TO_BUY, state.usdBalance))
        .then(() => Promise.resolve(true))
        .catch(() => {
          console.log("Failed buying.");
          return Promise.resolve(false);
        });
    };
    const trySellCurrency = () => {
      return sellCurrency(tradeAnalysis.securitySymbol, getBalance(state, tradeAnalysis.securitySymbol) * 0.99)
        .then(() => Promise.resolve(true))
        .catch(() => {
          console.log("Failed selling.")
          return Promise.resolve(false);
        });
    };

    const wasInTrade = state.tradingAlgoState.isInTrade;
    updateTradingAlgorithm(state.tradingAlgoState, tradeAnalysis, tradeAnalysis.candlestickCount - 1, tryBuyCurrency, trySellCurrency)
      .then(() => {
        if(!wasInTrade && state.tradingAlgoState.isInTrade) {
          onEnterTrade(tradeAnalysis.candlestickCount - 1);

          Sms.sendTextWithTwilio(
            state.settings.twilioAccountSid,
            state.settings.twilioAuthToken,
            state.settings.fromPhoneNumber,
            state.settings.toPhoneNumber,
            "Bought"
          );
        }
        if(wasInTrade && !state.tradingAlgoState.isInTrade) {
          onExitTrade(tradeAnalysis.candlestickCount - 1);

          Sms.sendTextWithTwilio(
            state.settings.twilioAccountSid,
            state.settings.twilioAuthToken,
            state.settings.fromPhoneNumber,
            state.settings.toPhoneNumber,
            "Sold"
          );
        }

        rerender();
      });

    /*if(tradeAnalysis.isVolumeAbnormal[tradeAnalysis.candlestickCount - 1]) {
      SMS.sendTextWithTwilio(
        this.state.twilioAccountSid,
        this.state.twilioAuthToken,
        this.state.fromPhoneNumber,
        this.state.toPhoneNumber,
        "Abnormal volume."
      );
    }*/
  }
}
function reloadCandlesticks() {
  const btcLoadingPromise = CryptoCompare.loadAggregate1MinCandlesticks("BTC", "USD", "Gemini", 15)
    .then(tradeAnalysis => {
      state.btcTradeAnalysis = tradeAnalysis;
      updateTradingAlgoWithNewTradeAnalysis(state.btcTradeAnalysis);
      rerender();
    });
  
  window.setTimeout(() => {
    const ethLoadingPromise =CryptoCompare.loadAggregate1MinCandlesticks("ETH", "USD", "Gemini", 15)
    .then(tradeAnalysis => {
      state.ethTradeAnalysis = tradeAnalysis;
      //updateTradingAlgoWithNewTradeAnalysis(state.ethTradeAnalysis);
      rerender();
    });
  }, 5000);
  
  return btcLoadingPromise;
}
function buyCurrency(securitySymbol: string, usdAmount: number): Promise<any> {
  if(!state.btcTradeAnalysis) { return Promise.reject("Null tradeAnalysis."); }
  
  const lastPrice = state.btcTradeAnalysis.closes[state.btcTradeAnalysis.candlestickCount - 1];

  const currencyAmount = parseFloat((usdAmount / lastPrice).toFixed(5));
  if(isNaN(currencyAmount)) { return Promise.reject("Invalid calculated currency amount."); }

  const price = parseFloat((1.03 * lastPrice).toFixed(2));

  return Gemini.buyCurrencyThroughGemini(state.settings.geminiApiKey, state.settings.geminiApiSecret, securitySymbol, currencyAmount, price)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error buying ${securitySymbol} through Gemini.`);
      }

      return response.json();
    }).then(json => {
      if(json.executed_amount === "0") {
        throw new Error(`Error buying ${securitySymbol} through Gemini.`);
      }

      return reloadGeminiBalances();
    });
}
function sellCurrency(securitySymbol: string, currencyAmount: number): Promise<any> {
  if(!state.btcTradeAnalysis) { return Promise.reject("Null tradeAnalysis."); }

  const lastPrice = state.btcTradeAnalysis.closes[state.btcTradeAnalysis.candlestickCount - 1];
  
  const sellCurrencyAmount = parseFloat(currencyAmount.toFixed(5));
  if(isNaN(sellCurrencyAmount)) { return Promise.reject("Invalid currency amount."); }

  const price = parseFloat((0.97 * lastPrice).toFixed(2));

  return Gemini.sellCurrencyThroughGemini(state.settings.geminiApiKey, state.settings.geminiApiSecret, securitySymbol, sellCurrencyAmount, price)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error selling ${securitySymbol} through Gemini.`);
      }

      return response.json();
    }).then(json => {
      if(json.executed_amount === "0") {
        throw new Error(`Error selling ${securitySymbol} through Gemini.`);
      }

      return reloadGeminiBalances();
    });
}

initialize();

interface AppState {
  buyUsdAmount: string;
  sellCurrencyAmount: string;
  showHeikinAshiCandlesticks: boolean;
  scrollOffsetInColumns: number;
  showSettings: boolean;
}

class App extends React.Component<{}, AppState> {
  entryPointOpenTimes = new Array<number>();
  exitPointOpenTimes = new Array<number>();
  
  keyDownEventHandler: (event: KeyboardEvent) => void;

  constructor() {
    super();

    this.state = {
      buyUsdAmount: "",
      sellCurrencyAmount: "",
      showHeikinAshiCandlesticks: false,
      scrollOffsetInColumns: 0,
      showSettings: false
    };
  }

  onCurrentCurrencyChange(event: any) {
  }

  onBuyUsdAmountChange(event: any) {
    this.setState({ buyUsdAmount: event.target.value });
  }
  
  onSellCurrencyAmountChange(event: any) {
    this.setState({ sellCurrencyAmount: event.target.value });
  }

  onGeminiApiKeyChange(event: any) {
    state.settings.geminiApiKey = event.target.value;
    this.forceUpdate();
  }
  onGeminiApiSecretChange(event: any) {
    state.settings.geminiApiSecret = event.target.value;
    this.forceUpdate();
  }

  onTwilioAccountSidChange(event: any) {
    state.settings.twilioAccountSid = event.target.value;
    this.forceUpdate();
  }
  onTwilioAuthTokenChange(event: any) {
    state.settings.twilioAuthToken = event.target.value;
    this.forceUpdate();
  }
  onFromPhoneNumberChange(event: any) {
    state.settings.fromPhoneNumber = event.target.value;
    this.forceUpdate();
  }
  onToPhoneNumberChange(event: any) {
    state.settings.toPhoneNumber = event.target.value;
    this.forceUpdate();
  }

  onKeyDown(event: KeyboardEvent) {
    switch(event.keyCode) {
      case ARROW_LEFT_KEY_CODE:
        this.setState({ scrollOffsetInColumns: this.state.scrollOffsetInColumns - 1 });
        break;
      case ARROW_RIGHT_KEY_CODE:
        this.setState({ scrollOffsetInColumns: this.state.scrollOffsetInColumns + 1 });
        break;
    }
  }

  onSaveSettings(event: any) {
    saveSettings(state.settings);
    this.forceUpdate();
  }
  onSendTestTextClick(event: any) {
    Sms.sendTextWithTwilio(
      state.settings.twilioAccountSid, state.settings.twilioAuthToken,
      state.settings.fromPhoneNumber, state.settings.toPhoneNumber,
      "Text from CryptoWick!"
    );
  }

  onShowHeikinAshiCandlesticksChange(event: any) {
    this.setState({ showHeikinAshiCandlesticks: event.target.checked });
  }

  onToggleSettingsClicked() {
    this.setState({ showSettings: !this.state.showSettings });
  }

  componentDidMount() {
    rerender = () => { this.forceUpdate(); };
    onEnterTrade = (candlestickIndex: number) => {
      this.entryPointOpenTimes.push(candlestickIndex);
      this.forceUpdate();
    };
    onExitTrade = (candlestickIndex: number) => {
      this.exitPointOpenTimes.push(candlestickIndex);
      this.forceUpdate();
    };

    this.keyDownEventHandler = this.onKeyDown.bind(this);
    window.addEventListener("keydown", this.keyDownEventHandler);
  }
  componentWillUnmount() {
    window.removeEventListener("keydown", this.keyDownEventHandler);
  }

  renderCharts(tradeAnalysis: TradeAnalysis | null): JSX.Element | null {
    if(!tradeAnalysis) { return null; }

    const useHeikinAshiCandlesticks = this.state.showHeikinAshiCandlesticks;

    const opens = !useHeikinAshiCandlesticks ? tradeAnalysis.opens : tradeAnalysis.heikinOpens;
    const highs = !useHeikinAshiCandlesticks ? tradeAnalysis.highs : tradeAnalysis.heikinHighs;
    const lows = !useHeikinAshiCandlesticks ? tradeAnalysis.lows : tradeAnalysis.heikinLows;
    const closes = !useHeikinAshiCandlesticks ? tradeAnalysis.closes : tradeAnalysis.heikinCloses;
    const volumes = tradeAnalysis.volumes;

    const heikinAshiCandlestickHeights = ArrayUtils.combineArrays(
      tradeAnalysis.heikinOpens,
      tradeAnalysis.heikinCloses,
      (a, b) => b - a
    );

    let areEntryPoints = new Array<boolean>(tradeAnalysis.candlestickCount);
    for(let i = 0; i < tradeAnalysis.candlestickCount; i++) {
      areEntryPoints[i] = this.entryPointOpenTimes.indexOf(tradeAnalysis.openTimes[i]) >= 0;
    }

    let areExitPoints = new Array<boolean>(tradeAnalysis.candlestickCount);
    for(let i = 0; i < tradeAnalysis.candlestickCount; i++) {
      areExitPoints[i] = this.exitPointOpenTimes.indexOf(tradeAnalysis.openTimes[i]) >= 0;
    }

    const candlestickColors = tradeAnalysis
      ? ArrayUtils.combineArrays(
          opens,
          closes,
          (open, close) => (close > open) ? "green" : "red"
        )
      : [];
    
    const columnWidth = 7;
    const columnHorizontalPadding = 1;

    const scrollOffsetInColumns = this.state.scrollOffsetInColumns;
    const highlightedColumnIndex = 1;

    let markers = new Array<Array<CandlestickMarker>>(tradeAnalysis.candlestickCount);
    for(let i = 0; i < markers.length; i++) {
      markers[i] = new Array<CandlestickMarker>();

      if(areEntryPoints[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.LETTER,
          CandlestickMarkerPosition.BELOW,
          "black",
          "B"
        ));
      }
      if(areExitPoints[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.LETTER,
          CandlestickMarkerPosition.ABOVE,
          "black",
          "S"
        ));
      }

      /*if(tradeAnalysis.isLocalMinima[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.TRIANGLE_DOWN,
          CandlestickMarkerPosition.BELOW,
          "green"
        ));
      }

      if(tradeAnalysis.isLocalMaxima[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.TRIANGLE_UP,
          CandlestickMarkerPosition.ABOVE,
          "red"
        ));
      }

      if(tradeAnalysis.isVolumeAbnormal[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.LETTER,
          CandlestickMarkerPosition.BELOW,
          "black",
          "V"
        ));
      }
      if(tradeAnalysis.didVolumeDrop[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.LETTER,
          CandlestickMarkerPosition.ABOVE,
          "red",
          "V"
        ));
      }*/
    }

    let lines = new Array<Array<number>>();
    lines.push(tradeAnalysis.sma50);

    const sma50Derivative2ndSma4 = Maths.laggingSimpleMovingAverage(tradeAnalysis.sma50Derivative2nd, 4);

    return (
      <div style={{ width: CHART_WIDTH + "px", float: "left", margin: "10px" }}>
        <CandlestickChart
          tradeAnalysis={tradeAnalysis}
          opens={opens}
          highs={highs}
          lows={lows}
          closes={closes}
          volumes={volumes}
          width={CHART_WIDTH}
          height={300}
          markers={markers}
          lines={lines}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
          highlightedColumnIndex={highlightedColumnIndex}
        />

        <HistogramChart
          chartTitle="Volume"
          values={tradeAnalysis.volumes}
          colors={candlestickColors}
          width={CHART_WIDTH}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
          highlightedColumnIndex={highlightedColumnIndex}
        />

        <LineChart
          chartTitle="SMA 50 1st d/dt"
          values={tradeAnalysis.sma50Derivative1st}
          width={CHART_WIDTH}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
        <LineChart
          chartTitle="SMA 50 2nd d/dt SMA 4"
          values={sma50Derivative2ndSma4}
          width={CHART_WIDTH}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
      </div>
    );

    /*
    <LineChart
          chartTitle="Heikin-Ashi Candlestick Body Heights"
          values={heikinAshiCandlestickHeights}
          width={CHART_WIDTH}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />

        <LineChart
          chartTitle="Stochastic Close"
          values={tradeAnalysis.stochasticClose}
          width={CHART_WIDTH}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />

        <LineChart
          chartTitle="Stochastic Volume"
          values={tradeAnalysis.stochasticVolume}
          width={CHART_WIDTH}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />

        <LineChart
          chartTitle="Bullishness"
          values={tradeAnalysis.bullishness}
          width={CHART_WIDTH}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
        
        <LineChart
          chartTitle="Lin. Reg. % Close Slope Concavity"
          values={tradeAnalysis.lineOfBestFitPercentCloseSlopeConcavity}
          width={CHART_WIDTH}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
        <LineChart
          chartTitle="Lin. Reg. % Close Slope * Volume"
          values={tradeAnalysis.linRegSlopePctCloseMulVolumeMean}
          width={CHART_WIDTH}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
    */
  }
  render() {
    const onCurrentCurrencyChange = this.onCurrentCurrencyChange.bind(this);
    const onBuyCurrencyClicked = buyCurrency.bind(this, "BTCUSD", this.state.buyUsdAmount);
    const onSellCurrencyClicked = sellCurrency.bind(this, "BTCUSD", this.state.sellCurrencyAmount);
    const onBuyUsdAmountChange = this.onBuyUsdAmountChange.bind(this);
    const onSellCurrencyAmountChange = this.onSellCurrencyAmountChange.bind(this);
    const onGeminiApiKeyChange = this.onGeminiApiKeyChange.bind(this);
    const onGeminiApiSecretChange = this.onGeminiApiSecretChange.bind(this);
    const onTwilioAccountSidChange = this.onTwilioAccountSidChange.bind(this);
    const onTwilioAuthTokenChange = this.onTwilioAuthTokenChange.bind(this);
    const onFromPhoneNumberChange = this.onFromPhoneNumberChange.bind(this);
    const onToPhoneNumberChange = this.onToPhoneNumberChange.bind(this);
    const onSaveSettings = this.onSaveSettings.bind(this);
    const onSendTestTextClick = this.onSendTestTextClick.bind(this);
    const onShowHeikinAshiCandlesticksChange = this.onShowHeikinAshiCandlesticksChange.bind(this);
    const onToggleSettingsClicked = this.onToggleSettingsClicked.bind(this);

    return (
      <div className="App">
        <p>USD: {state.usdBalance} BTC: {state.btcBalance} ETH: {state.ethBalance}</p>
        <p>{state.tradingAlgoState.isInTrade ? "IN TRADE" : "NOT IN TRADE"}</p>
        {false
          ? (
              <select value={"BTC"} onChange={onCurrentCurrencyChange}>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            )
          : null}
        {state.btcTradeAnalysis ? <p>Last: {state.btcTradeAnalysis.closes[state.btcTradeAnalysis.candlestickCount - 1]}</p> : null}
        <div>
          <div>
            Buy Amount (USD)
            <input type="text" value={this.state.buyUsdAmount} onChange={onBuyUsdAmountChange} />
            <button onClick={onBuyCurrencyClicked}>Buy</button>
          </div>

          <div>
            Sell Amount (BTC)
            <input type="text" value={this.state.sellCurrencyAmount} onChange={onSellCurrencyAmountChange} />
            <button onClick={onSellCurrencyClicked}>Sell</button>
          </div>
        </div>
        <div><input type="checkbox" checked={this.state.showHeikinAshiCandlesticks} onChange={onShowHeikinAshiCandlesticksChange} /> Show Heikin-Ashi</div>
        {this.renderCharts(state.btcTradeAnalysis)}
        {this.renderCharts(state.ethTradeAnalysis)}
        <div style={{ clear: "both" }} />

        {this.state.showSettings ? (
          <div>
            <div>
              <div>
                Twilio Account SID
                <input type="text" value={state.settings.twilioAccountSid} onChange={onTwilioAccountSidChange} />
              </div>

              <div>
                Twilio Auth Token
                <input type="text" value={state.settings.twilioAuthToken} onChange={onTwilioAuthTokenChange} />
              </div>

              <div>
                From
                <input type="text" value={state.settings.fromPhoneNumber} onChange={onFromPhoneNumberChange} />
              </div>

              <div>
                To
                <input type="text" value={state.settings.toPhoneNumber} onChange={onToPhoneNumberChange} />
              </div>
            </div>
            <div><button onClick={onSendTestTextClick}>Send Test Text</button></div>

            <div>
              <div>
                Gemini Public Key
                <input type="text" value={state.settings.geminiApiKey} onChange={onGeminiApiKeyChange} />
              </div>

              <div>
                Gemini Private Key
                <input type="text" value={state.settings.geminiApiSecret} onChange={onGeminiApiSecretChange} />
              </div>
            </div>
            <div><button onClick={onSaveSettings}>Save Settings</button></div>

            <button onClick={onToggleSettingsClicked}>Hide Settings</button>
          </div>
        ) : <button onClick={onToggleSettingsClicked}>Show Settings</button>}
      </div>
    );
  }
}

export default App;