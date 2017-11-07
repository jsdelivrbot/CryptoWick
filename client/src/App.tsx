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

interface AppState {
  currentCurrency: string;
  tradeAnalysis: TradeAnalysis | null;

  usdBalance: number;
  btcBalance: number;
  ethBalance: number;

  buyUsdAmount: string;
  sellCurrencyAmount: string;

  geminiApiKey: string;
  geminiApiSecret: string;

  twilioAccountSid: string;
  twilioAuthToken: string;
  fromPhoneNumber: string;
  toPhoneNumber: string;

  showHeikinAshiCandlesticks: boolean;
  useFakeHistoricalTrades: boolean;
  scrollOffsetInColumns: number;
}

class App extends React.Component<{}, AppState> {
  refreshCandlesticksIntervalHandle: number;
  refreshIntervalSeconds = 30;

  tradingAlgoState = new TradingAlgorithmState();
  entryPointOpenTimes = new Array<number>();
  exitPointOpenTimes = new Array<number>();
  
  keyDownEventHandler: (event: KeyboardEvent) => void;

  constructor() {
    super();

    this.state = {
      currentCurrency: "BTC",
      tradeAnalysis: null,

      usdBalance: 0,
      btcBalance: 0,
      ethBalance: 0,

      buyUsdAmount: "",
      sellCurrencyAmount: "",

      geminiApiKey: "",
      geminiApiSecret: "",

      twilioAccountSid: "",
      twilioAuthToken: "",
      fromPhoneNumber: "+1",
      toPhoneNumber: "+1",

      showHeikinAshiCandlesticks: false,
      useFakeHistoricalTrades: false,

      scrollOffsetInColumns: 0
    };
  }

  onCurrentCurrencyChange(event: any) {
    this.setState({ currentCurrency: event.target.value }, this.reloadCandlesticks);
  }

  onBuyUsdAmountChange(event: any) {
    this.setState({ buyUsdAmount: event.target.value });
  }
  
  onSellCurrencyAmountChange(event: any) {
    this.setState({ sellCurrencyAmount: event.target.value });
  }

  buyCurrency(currency: string, usdAmount: number): Promise<any> {
    if(!this.state.tradeAnalysis) { return Promise.reject("Null tradeAnalysis."); }

    const lastPrice = this.state.tradeAnalysis.closes[this.state.tradeAnalysis.candlestickCount - 1];

    const currencyAmount = parseFloat((usdAmount / lastPrice).toFixed(5));
    if(isNaN(currencyAmount)) { return Promise.reject("Invalid calculated currency amount."); }

    const price = parseFloat((1.03 * lastPrice).toFixed(2));
    const securitySymbol = `${currency}USD`;

    return Gemini.buyCurrencyThroughGemini(this.state.geminiApiKey, this.state.geminiApiSecret, securitySymbol, currencyAmount, price)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error buying ${securitySymbol} through Gemini.`);
        }

        return response.json();
      }).then(json => {
        if(json.executed_amount === "0") {
          throw new Error(`Error buying ${securitySymbol} through Gemini.`);
        }

        return this.reloadGeminiBalances();
      });
  }
  sellCurrency(currency: string, currencyAmount: number): Promise<any> {
    if(!this.state.tradeAnalysis) { return Promise.reject("Null tradeAnalysis."); }

    const lastPrice = this.state.tradeAnalysis.closes[this.state.tradeAnalysis.candlestickCount - 1];
    
    const sellCurrencyAmount = parseFloat(currencyAmount.toFixed(5));
    if(isNaN(sellCurrencyAmount)) { return Promise.reject("Invalid currency amount."); }

    const price = parseFloat((0.97 * lastPrice).toFixed(2));
    const securitySymbol = `${currency}USD`;

    return Gemini.sellCurrencyThroughGemini(this.state.geminiApiKey, this.state.geminiApiSecret, securitySymbol, sellCurrencyAmount, price)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error selling ${securitySymbol} through Gemini.`);
        }

        return response.json();
      }).then(json => {
        if(json.executed_amount === "0") {
          throw new Error(`Error selling ${securitySymbol} through Gemini.`);
        }

        return this.reloadGeminiBalances();
      });
  }

  onGeminiApiKeyChange(event: any) {
    this.setState({ geminiApiKey: event.target.value });
  }
  onGeminiApiSecretChange(event: any) {
    this.setState({ geminiApiSecret: event.target.value });
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
    const settings = new Settings(
      this.state.geminiApiKey,
      this.state.geminiApiSecret,

      this.state.twilioAccountSid,
      this.state.twilioAuthToken,
      this.state.fromPhoneNumber,
      this.state.toPhoneNumber);
    
    saveSettings(settings);
  }
  onSendTestTextClick(event: any) {
    Sms.sendTextWithTwilio(
      this.state.twilioAccountSid, this.state.twilioAuthToken,
      this.state.fromPhoneNumber, this.state.toPhoneNumber,
      "Text from CryptoWick!"
    );
  }

  onShowHeikinAshiCandlesticksChange(event: any) {
    this.setState({ showHeikinAshiCandlesticks: event.target.checked });
  }

  reloadCandlesticks() {
    CryptoCompare.loadAggregate1MinCandlesticks(this.state.currentCurrency, "USD", "Gemini", 15)
    .then(tradeAnalysis => {
      const lastOpenTime = this.state.tradeAnalysis
        ? this.state.tradeAnalysis.openTimes[this.state.tradeAnalysis.candlestickCount - 1]
        : null;
      const mostRecentOpenTime = tradeAnalysis.openTimes[tradeAnalysis.candlestickCount - 1];

      this.setState({
        tradeAnalysis: tradeAnalysis
      });

      const isNewAnalysis = !lastOpenTime || (mostRecentOpenTime > lastOpenTime);

      if (isNewAnalysis) {
        if(lastOpenTime === null) {
          if(this.state.useFakeHistoricalTrades) {
            const fakeBuyCurrency = () => Promise.resolve(true);
            const fakeSellCurrency = () => Promise.resolve(true);
  
            for(let i = 0; i < (tradeAnalysis.candlestickCount - 1); i++) {
              const wasInTrade = this.tradingAlgoState.isInTrade;
              updateTradingAlgorithm(this.tradingAlgoState, tradeAnalysis, i, fakeBuyCurrency, fakeSellCurrency)
                .then(() => {
                  if(!wasInTrade && this.tradingAlgoState.isInTrade) { this.entryPointOpenTimes.push(tradeAnalysis.openTimes[i]); }
                  if(wasInTrade && !this.tradingAlgoState.isInTrade) { this.exitPointOpenTimes.push(tradeAnalysis.openTimes[i]); }
                });
            }
          }
        }

        const tryBuyCurrency = () => {
          return this.buyCurrency("BTC", Math.min(ALGORITHM_USD_TO_BUY, this.state.usdBalance))
            .then(() => Promise.resolve(true))
            .catch(() => {
              console.log("Failed buying.");
              return Promise.resolve(false);
            });
        };
        const trySellCurrency = () => {
          return this.sellCurrency("BTC", this.state.btcBalance * 0.99)
            .then(() => Promise.resolve(true))
            .catch(() => {
              console.log("Failed selling.")
              return Promise.resolve(false);
            });
        };

        const wasInTrade = this.tradingAlgoState.isInTrade;
        updateTradingAlgorithm(this.tradingAlgoState, tradeAnalysis, tradeAnalysis.candlestickCount - 1, tryBuyCurrency, trySellCurrency)
          .then(() => {
            if(!wasInTrade && this.tradingAlgoState.isInTrade) {
              this.entryPointOpenTimes.push(mostRecentOpenTime);
    
              Sms.sendTextWithTwilio(
                this.state.twilioAccountSid,
                this.state.twilioAuthToken,
                this.state.fromPhoneNumber,
                this.state.toPhoneNumber,
                "Bought"
              );
            }
            if(wasInTrade && !this.tradingAlgoState.isInTrade) {
              this.exitPointOpenTimes.push(mostRecentOpenTime);
    
              Sms.sendTextWithTwilio(
                this.state.twilioAccountSid,
                this.state.twilioAuthToken,
                this.state.fromPhoneNumber,
                this.state.toPhoneNumber,
                "Sold"
              );
            }
    
            this.forceUpdate();
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
    });
  }
  reloadGeminiBalances() {
    return Gemini.loadAccountBalances(this.state.geminiApiKey, this.state.geminiApiSecret)
      .then(json => {
        const newState = {
          usdBalance: json.USD,
          btcBalance: json.BTC,
          ethBalance: json.ETH
        };
        
        if(newState.btcBalance > 0.001) {
          this.tradingAlgoState.isInTrade = true;
        }

        this.setState(newState);
      });
  }

  componentDidMount() {
    const settings = loadSettings();
    if (settings) {
      const afterSettingsApplied = () => {
        if(settings.geminiApiKey) {
          this.reloadGeminiBalances()
            .then(() => {
              if(settings.twilioAccountSid) {
                this.reloadCandlesticks();
                this.refreshCandlesticksIntervalHandle = setInterval(
                  this.reloadCandlesticks.bind(this),
                  1000 * this.refreshIntervalSeconds
                );
              }
            });
        }
      };

      this.setState({
        geminiApiKey: settings.geminiApiKey,
        geminiApiSecret: settings.geminiApiSecret,

        twilioAccountSid: settings.twilioAccountSid,
        twilioAuthToken: settings.twilioAuthToken,
        fromPhoneNumber: settings.fromPhoneNumber,
        toPhoneNumber: settings.toPhoneNumber
      }, afterSettingsApplied);
    }

    this.keyDownEventHandler = this.onKeyDown.bind(this);
    window.addEventListener("keydown", this.keyDownEventHandler);
  }
  componentWillUnmount() {
    window.removeEventListener("keydown", this.keyDownEventHandler);

    clearInterval(this.refreshCandlesticksIntervalHandle);
  }

  renderCharts() {
    if(!this.state.tradeAnalysis) { return null; }

    const useHeikinAshiCandlesticks = this.state.showHeikinAshiCandlesticks;

    const opens = !useHeikinAshiCandlesticks ? this.state.tradeAnalysis.opens : this.state.tradeAnalysis.heikinOpens;
    const highs = !useHeikinAshiCandlesticks ? this.state.tradeAnalysis.highs : this.state.tradeAnalysis.heikinHighs;
    const lows = !useHeikinAshiCandlesticks ? this.state.tradeAnalysis.lows : this.state.tradeAnalysis.heikinLows;
    const closes = !useHeikinAshiCandlesticks ? this.state.tradeAnalysis.closes : this.state.tradeAnalysis.heikinCloses;
    const volumes = this.state.tradeAnalysis.volumes;

    const heikinAshiCandlestickHeights = ArrayUtils.combineArrays(
      this.state.tradeAnalysis.heikinOpens,
      this.state.tradeAnalysis.heikinCloses,
      (a, b) => b - a
    );

    let areEntryPoints = new Array<boolean>(this.state.tradeAnalysis.candlestickCount);
    for(let i = 0; i < this.state.tradeAnalysis.candlestickCount; i++) {
      areEntryPoints[i] = this.entryPointOpenTimes.indexOf(this.state.tradeAnalysis.openTimes[i]) >= 0;
    }

    let areExitPoints = new Array<boolean>(this.state.tradeAnalysis.candlestickCount);
    for(let i = 0; i < this.state.tradeAnalysis.candlestickCount; i++) {
      areExitPoints[i] = this.exitPointOpenTimes.indexOf(this.state.tradeAnalysis.openTimes[i]) >= 0;
    }

    const candlestickColors = this.state.tradeAnalysis
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

    let markers = new Array<Array<CandlestickMarker>>(this.state.tradeAnalysis.candlestickCount);
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

      /*if(this.state.tradeAnalysis.isLocalMinima[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.TRIANGLE_DOWN,
          CandlestickMarkerPosition.BELOW,
          "green"
        ));
      }

      if(this.state.tradeAnalysis.isLocalMaxima[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.TRIANGLE_UP,
          CandlestickMarkerPosition.ABOVE,
          "red"
        ));
      }

      if(this.state.tradeAnalysis.isVolumeAbnormal[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.LETTER,
          CandlestickMarkerPosition.BELOW,
          "black",
          "V"
        ));
      }
      if(this.state.tradeAnalysis.didVolumeDrop[i]) {
        markers[i].push(new CandlestickMarker(
          CandlestickMarkerType.LETTER,
          CandlestickMarkerPosition.ABOVE,
          "red",
          "V"
        ));
      }*/
    }

    let lines = new Array<Array<number>>();
    lines.push(this.state.tradeAnalysis.sma50);

    const sma50Derivative2ndSma4 = Maths.laggingSimpleMovingAverage(this.state.tradeAnalysis.sma50Derivative2nd, 4);

    return (
      <div>
        <CandlestickChart
          tradeAnalysis={this.state.tradeAnalysis}
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
          values={this.state.tradeAnalysis.volumes}
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
          values={this.state.tradeAnalysis.sma50Derivative1st}
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
          values={this.state.tradeAnalysis.stochasticClose}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />

        <LineChart
          chartTitle="Stochastic Volume"
          values={this.state.tradeAnalysis.stochasticVolume}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />

        <LineChart
          chartTitle="Bullishness"
          values={this.state.tradeAnalysis.bullishness}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
        
        <LineChart
          chartTitle="Lin. Reg. % Close Slope Concavity"
          values={this.state.tradeAnalysis.lineOfBestFitPercentCloseSlopeConcavity}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
        <LineChart
          chartTitle="Lin. Reg. % Close Slope * Volume"
          values={this.state.tradeAnalysis.linRegSlopePctCloseMulVolumeMean}
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
    const buyCurrency = this.buyCurrency.bind(this, this.state.currentCurrency, this.state.buyUsdAmount);
    const sellCurrency = this.sellCurrency.bind(this, this.state.currentCurrency, this.state.sellCurrencyAmount);
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
        <p>USD: {this.state.usdBalance} BTC: {this.state.btcBalance} ETH: {this.state.ethBalance}</p>
        <p>{this.tradingAlgoState.isInTrade ? "IN TRADE" : "NOT IN TRADE"}</p>
        {false
          ? (
              <select value={this.state.currentCurrency} onChange={onCurrentCurrencyChange}>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            )
          : null}
        {this.state.tradeAnalysis ? <p>Last: {this.state.tradeAnalysis.closes[this.state.tradeAnalysis.candlestickCount - 1]}</p> : null}
        <div>
          <div>
            Buy Amount (USD)
            <input type="text" value={this.state.buyUsdAmount} onChange={onBuyUsdAmountChange} />
            <button onClick={buyCurrency}>Buy</button>
          </div>

          <div>
            Sell Amount ({this.state.currentCurrency})
            <input type="text" value={this.state.sellCurrencyAmount} onChange={onSellCurrencyAmountChange} />
            <button onClick={sellCurrency}>Sell</button>
          </div>
        </div>
        <div><input type="checkbox" checked={this.state.showHeikinAshiCandlesticks} onChange={onShowHeikinAshiCandlesticksChange} /> Show Heikin-Ashi</div>
        {this.renderCharts()}
        <div>
          <div>
            Twilio Account SID
            <input type="text" value={this.state.twilioAccountSid} onChange={onTwilioAccountSidChange} />
          </div>

          <div>
            Twilio Auth Token
            <input type="text" value={this.state.twilioAuthToken} onChange={onTwilioAuthTokenChange} />
          </div>

          <div>
            From
            <input type="text" value={this.state.fromPhoneNumber} onChange={onFromPhoneNumberChange} />
          </div>

          <div>
            To
            <input type="text" value={this.state.toPhoneNumber} onChange={onToPhoneNumberChange} />
          </div>
        </div>
        <div>
          <div>
            Gemini Public Key
            <input type="text" value={this.state.geminiApiKey} onChange={onGeminiApiKeyChange} />
          </div>

          <div>
            Gemini Private Key
            <input type="text" value={this.state.geminiApiSecret} onChange={onGeminiApiSecretChange} />
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