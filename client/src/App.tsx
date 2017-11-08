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

let refreshCandlesticksIntervalHandle: number;

class State {
  currentCurrency: string; // TODO: REMOVE!!!
  tradeAnalysis: TradeAnalysis | null;
  tradingAlgoState: TradingAlgorithmState;

  usdBalance: number;
  btcBalance: number;
  ethBalance: number;

  settings: Settings;
  useFakeHistoricalTrades: boolean;
}

let state = new State();
state.currentCurrency = "BTC";
state.tradingAlgoState = new TradingAlgorithmState();
state.settings = new Settings('', '', '', '', '', '');
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
function reloadCandlesticks() {
  return CryptoCompare.loadAggregate1MinCandlesticks(state.currentCurrency, "USD", "Gemini", 15)
    .then(tradeAnalysis => {
      const lastOpenTime = state.tradeAnalysis
        ? state.tradeAnalysis.openTimes[state.tradeAnalysis.candlestickCount - 1]
        : null;
      const mostRecentOpenTime = tradeAnalysis.openTimes[tradeAnalysis.candlestickCount - 1];

      state.tradeAnalysis = tradeAnalysis;

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
          return buyCurrency("BTC", Math.min(ALGORITHM_USD_TO_BUY, state.usdBalance))
            .then(() => Promise.resolve(true))
            .catch(() => {
              console.log("Failed buying.");
              return Promise.resolve(false);
            });
        };
        const trySellCurrency = () => {
          return sellCurrency("BTC", state.btcBalance * 0.99)
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

      rerender();
    });
}
function buyCurrency(currency: string, usdAmount: number): Promise<any> {
  if(!state.tradeAnalysis) { return Promise.reject("Null tradeAnalysis."); }

  const lastPrice = state.tradeAnalysis.closes[state.tradeAnalysis.candlestickCount - 1];

  const currencyAmount = parseFloat((usdAmount / lastPrice).toFixed(5));
  if(isNaN(currencyAmount)) { return Promise.reject("Invalid calculated currency amount."); }

  const price = parseFloat((1.03 * lastPrice).toFixed(2));
  const securitySymbol = `${currency}USD`;

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
function sellCurrency(currency: string, currencyAmount: number): Promise<any> {
  if(!state.tradeAnalysis) { return Promise.reject("Null tradeAnalysis."); }

  const lastPrice = state.tradeAnalysis.closes[state.tradeAnalysis.candlestickCount - 1];
  
  const sellCurrencyAmount = parseFloat(currencyAmount.toFixed(5));
  if(isNaN(sellCurrencyAmount)) { return Promise.reject("Invalid currency amount."); }

  const price = parseFloat((0.97 * lastPrice).toFixed(2));
  const securitySymbol = `${currency}USD`;

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
      scrollOffsetInColumns: 0
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

  componentDidMount() {
    rerender = () => { this.forceUpdate(); };
    onEnterTrade = (candlestickIndex: number) => {
      this.entryPointOpenTimes.push(candlestickIndex);
      rerender();
    };
    onExitTrade = (candlestickIndex: number) => {
      this.exitPointOpenTimes.push(candlestickIndex);
      rerender();
    };

    this.keyDownEventHandler = this.onKeyDown.bind(this);
    window.addEventListener("keydown", this.keyDownEventHandler);
  }
  componentWillUnmount() {
    window.removeEventListener("keydown", this.keyDownEventHandler);
  }

  renderCharts() {
    if(!state.tradeAnalysis) { return null; }

    const useHeikinAshiCandlesticks = this.state.showHeikinAshiCandlesticks;

    const opens = !useHeikinAshiCandlesticks ? state.tradeAnalysis.opens : state.tradeAnalysis.heikinOpens;
    const highs = !useHeikinAshiCandlesticks ? state.tradeAnalysis.highs : state.tradeAnalysis.heikinHighs;
    const lows = !useHeikinAshiCandlesticks ? state.tradeAnalysis.lows : state.tradeAnalysis.heikinLows;
    const closes = !useHeikinAshiCandlesticks ? state.tradeAnalysis.closes : state.tradeAnalysis.heikinCloses;
    const volumes = state.tradeAnalysis.volumes;

    const heikinAshiCandlestickHeights = ArrayUtils.combineArrays(
      state.tradeAnalysis.heikinOpens,
      state.tradeAnalysis.heikinCloses,
      (a, b) => b - a
    );

    let areEntryPoints = new Array<boolean>(state.tradeAnalysis.candlestickCount);
    for(let i = 0; i < state.tradeAnalysis.candlestickCount; i++) {
      areEntryPoints[i] = this.entryPointOpenTimes.indexOf(state.tradeAnalysis.openTimes[i]) >= 0;
    }

    let areExitPoints = new Array<boolean>(state.tradeAnalysis.candlestickCount);
    for(let i = 0; i < state.tradeAnalysis.candlestickCount; i++) {
      areExitPoints[i] = this.exitPointOpenTimes.indexOf(state.tradeAnalysis.openTimes[i]) >= 0;
    }

    const candlestickColors = state.tradeAnalysis
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

    let markers = new Array<Array<CandlestickMarker>>(state.tradeAnalysis.candlestickCount);
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

      /*if(state.tradeAnalysis.isLocalMinima[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.TRIANGLE_DOWN,
          CandlestickMarkerPosition.BELOW,
          "green"
        ));
      }

      if(state.tradeAnalysis.isLocalMaxima[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.TRIANGLE_UP,
          CandlestickMarkerPosition.ABOVE,
          "red"
        ));
      }

      if(state.tradeAnalysis.isVolumeAbnormal[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.LETTER,
          CandlestickMarkerPosition.BELOW,
          "black",
          "V"
        ));
      }
      if(state.tradeAnalysis.didVolumeDrop[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.LETTER,
          CandlestickMarkerPosition.ABOVE,
          "red",
          "V"
        ));
      }*/
    }

    let lines = new Array<Array<number>>();
    lines.push(state.tradeAnalysis.sma50);

    const sma50Derivative2ndSma4 = Maths.laggingSimpleMovingAverage(state.tradeAnalysis.sma50Derivative2nd, 4);

    return (
      <div>
        <CandlestickChart
          tradeAnalysis={state.tradeAnalysis}
          opens={opens}
          highs={highs}
          lows={lows}
          closes={closes}
          volumes={volumes}
          width={800}
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
          values={state.tradeAnalysis.volumes}
          colors={candlestickColors}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
          highlightedColumnIndex={highlightedColumnIndex}
        />

        <LineChart
          chartTitle="SMA 50 1st d/dt"
          values={state.tradeAnalysis.sma50Derivative1st}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
        <LineChart
          chartTitle="SMA 50 2nd d/dt SMA 4"
          values={sma50Derivative2ndSma4}
          width={800}
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
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />

        <LineChart
          chartTitle="Stochastic Close"
          values={state.tradeAnalysis.stochasticClose}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />

        <LineChart
          chartTitle="Stochastic Volume"
          values={state.tradeAnalysis.stochasticVolume}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />

        <LineChart
          chartTitle="Bullishness"
          values={state.tradeAnalysis.bullishness}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
        
        <LineChart
          chartTitle="Lin. Reg. % Close Slope Concavity"
          values={state.tradeAnalysis.lineOfBestFitPercentCloseSlopeConcavity}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
        <LineChart
          chartTitle="Lin. Reg. % Close Slope * Volume"
          values={state.tradeAnalysis.linRegSlopePctCloseMulVolumeMean}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
    */
  }
  render() {
    const onCurrentCurrencyChange = this.onCurrentCurrencyChange.bind(this);
    const onBuyCurrencyClicked = buyCurrency.bind(this, state.currentCurrency, this.state.buyUsdAmount);
    const onSellCurrencyClicked = sellCurrency.bind(this, state.currentCurrency, this.state.sellCurrencyAmount);
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

    return (
      <div className="App">
        <p>USD: {state.usdBalance} BTC: {state.btcBalance} ETH: {state.ethBalance}</p>
        <p>{state.tradingAlgoState.isInTrade ? "IN TRADE" : "NOT IN TRADE"}</p>
        {false
          ? (
              <select value={state.currentCurrency} onChange={onCurrentCurrencyChange}>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            )
          : null}
        {state.tradeAnalysis ? <p>Last: {state.tradeAnalysis.closes[state.tradeAnalysis.candlestickCount - 1]}</p> : null}
        <div>
          <div>
            Buy Amount (USD)
            <input type="text" value={this.state.buyUsdAmount} onChange={onBuyUsdAmountChange} />
            <button onClick={onBuyCurrencyClicked}>Buy</button>
          </div>

          <div>
            Sell Amount ({state.currentCurrency})
            <input type="text" value={this.state.sellCurrencyAmount} onChange={onSellCurrencyAmountChange} />
            <button onClick={onSellCurrencyClicked}>Sell</button>
          </div>
        </div>
        <div><input type="checkbox" checked={this.state.showHeikinAshiCandlesticks} onChange={onShowHeikinAshiCandlesticksChange} /> Show Heikin-Ashi</div>
        {this.renderCharts()}
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
        <div>
          <button onClick={onSaveSettings}>Save Settings</button>
          <button onClick={onSendTestTextClick}>Send Test Text</button>
        </div>
      </div>
    );
  }
}

export default App;