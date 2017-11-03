import * as React from "react";
import { HmacSHA384, enc } from "crypto-js";
import "./App.css";

//const logo = require("./logo.svg");

const ARROW_LEFT_KEY_CODE = 37;
const ARROW_RIGHT_KEY_CODE = 39;

namespace Debug {
  export function assert(condition: boolean) {
    if (!condition) {
      throw new Error(`Failed assertion.`);
    }
  }
}

namespace SMS {
  export function sendTextWithTwilio(
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
}

namespace Maths {
  export class Vector2 {
    constructor(public x: number, public y: number) {}
  }

  export function divNoNaN(a: number, b: number) {
    return (b !== 0) ? (a / b) : 0;
  }

  export function transformValueInRange(min1: number, max1: number, min2: number, max2: number, value: number): number {
    const pctInRange = (value - min1) / (max1 - min1);
    return min2 + (pctInRange * (max2 - min2))
  }
  export class LinearLeastSquaresResult {
    m: number;
    b: number;
    r2: number;
  }
  export function linearLeastSquares(points: Maths.Vector2[]): LinearLeastSquaresResult {
    Debug.assert(points != null);
    Debug.assert(points.length >= 2);
  
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
  export function movingDerivative(values: number[], h: number): number[] {
    Debug.assert(values !== null);
    Debug.assert(h > 0);
  
    if (values.length < 2) { return new Array<number>(values.length); }
  
    const lastIndex = values.length - 1;
    return values.map((value, index) => {
        if (index === 0) {
            // forward difference
            return (values[index + 1] - values[index]) / h;
        } else if (index === lastIndex) {
            // backward difference
            return (values[index] - values[index - 1]) / h;
        } else {
            // central difference
            return (values[index + 1] - values[index - 1]) / (2 * h);
        }
    });
  }
  export function movingSecondDerivative(values: number[], h: number): number[] {
    Debug.assert(values !== null);
    Debug.assert(h > 0);
  
    if (values.length < 3) { return new Array<number>(values.length); }
  
    const lastIndex = values.length - 1;
    const hSquared = h * h;
    return values.map((value, index) => {
        if (index === 0) {
            // forward
            return (values[index + 2] - (2 * values[index + 1]) + values[index]) / hSquared;
        } else if (index === lastIndex) {
            // backward
            return (values[index] - (2 * values[index - 1]) + values[index - 2]) / hSquared;
        } else {
            // central
            return (values[index + 1] - (2 * values[index]) + values[index - 1]) / hSquared;
        }
    });
  }
  export function sum(values: number[], startIndex: number, valueCount: number): number {
    Debug.assert(values !== null);
    Debug.assert(valueCount >= 1);
    Debug.assert((startIndex + valueCount) <= values.length);

    let valueSum = 0;
    
    const endIndexExclusive = startIndex + valueCount;
    for(let i = startIndex; i < endIndexExclusive; i++) {
        valueSum += values[i];
    }
  
    return valueSum;
  }
  export function min(values: number[], startIndex: number, valueCount: number): number {
    Debug.assert(values !== null);
    Debug.assert(valueCount >= 1);
    Debug.assert((startIndex + valueCount) <= values.length);

    const endIndexExclusive = startIndex + valueCount;
    let minValue = values[startIndex];

    for(let i = startIndex + 1; i < endIndexExclusive; i++) {
      if(values[i] < minValue) {
        minValue = values[i];
      }
    }

    return minValue;
  }
  export function max(values: number[], startIndex: number, valueCount: number): number {
    Debug.assert(values !== null);
    Debug.assert(valueCount >= 1);
    Debug.assert((startIndex + valueCount) <= values.length);

    const endIndexExclusive = startIndex + valueCount;
    let maxValue = values[startIndex];

    for(let i = startIndex + 1; i < endIndexExclusive; i++) {
      if(values[i] > maxValue) {
        maxValue = values[i];
      }
    }

    return maxValue;
  }
  export function mean(values: number[]): number {
    return sum(values, 0, values.length) / values.length;
  }
  export function meanArraySlice(values: number[], startIndex: number, valueCount: number): number {
    return sum(values, startIndex, valueCount) / valueCount;
  }
  export function populationVariance(values: number[], startIndex: number, valueCount: number): number {
    let result = 0;
    const mean = meanArraySlice(values, startIndex, valueCount);

    const exclusiveEndIndex = startIndex + valueCount;
    for(let i = startIndex; i < exclusiveEndIndex; i++) {
      const diffFromMean = values[i] - mean;
      result += diffFromMean * diffFromMean;
    }

    result /= valueCount;
    return result;
  }
  export function sampleVariance(values: number[], startIndex: number, valueCount: number): number {
    let result = 0;
    const mean = meanArraySlice(values, startIndex, valueCount);

    const exclusiveEndIndex = startIndex + valueCount;
    for(let i = startIndex; i < exclusiveEndIndex; i++) {
      const diffFromMean = values[i] - mean;
      result += diffFromMean * diffFromMean;
    }

    result /= (valueCount - 1);
    return result;
  }
  export function populationStandardDeviation(values: number[], startIndex: number, valueCount: number): number {
    return Math.sqrt(populationVariance(values, startIndex, valueCount));
  }
  export function sampleStandardDeviation(values: number[], startIndex: number, valueCount: number): number {
    return Math.sqrt(sampleVariance(values, startIndex, valueCount));
  }
  export function inRangeInclusive(value: number, min: number, max: number) {
    Debug.assert(max >= min);

    return (value >= min) && (value <= max);
  }

  export function laggingReduce<T>(
    values: number[],
    lookbacklength: number,
    reduceFunc: (values: number[], startIndex: number, count: number) => T
  ): T[] {
    Debug.assert(values !== null);
    Debug.assert(lookbacklength > 0);
  
    return values.map((value, currentValueIndex) => {
        const firstValueIndex = Math.max(currentValueIndex - (lookbacklength - 1), 0);
        const valueCount = (currentValueIndex - firstValueIndex) + 1;
  
        return reduceFunc(values, firstValueIndex, valueCount);
    });
  }
  export function laggingSimpleMovingAverage(values: number[], lookbacklength: number): number[] {
    return laggingReduce(values, lookbacklength, meanArraySlice);
  }
  export function laggingExponentialMovingAverage(values: number[], lookbacklength: number): number[] {
    Debug.assert(values !== null);
    Debug.assert(lookbacklength > 0);
  
    if(values.length === 0) { return new Array<number>(0); }
  
    const alpha = 2.0 / (lookbacklength + 1); // smoothing factor
    let ema = new Array<number>(values.length);
  
    ema[0] = values[0];
  
    for(let i = 1; i < values.length; i++) {
        ema[i] = ((1.0 - alpha) * ema[i - 1]) + (alpha * values[i]);
    }
  
    return ema;
  }

  export function stochasticOscillator(values: number[], lookbacklength: number): number[] {
    return laggingReduce(values, lookbacklength, (values, startIndex, count) => {
      const endIndexExclusive = startIndex + count;
      const curVal = values[endIndexExclusive - 1];
      const low = Maths.min(values, startIndex, count);
      const high = Maths.max(values, startIndex, count);
      const valRange = high - low;

      return (valRange > 0) ? ((curVal - low) / (high - low)) : 0;
    });
  }
}

namespace Graphics {
  export function fillRect(
    context2d: CanvasRenderingContext2D,
    position: Maths.Vector2,
    width: number, height: number,
    fillStyle: string) {
      context2d.fillStyle = fillStyle;
      context2d.fillRect(position.x, position.y, width, height);
  }
  export function fillCircle(
    context2d: CanvasRenderingContext2D,
    position: Maths.Vector2,
    radius: number,
    fillStyle: string) {
      context2d.beginPath();
      context2d.arc(position.x, position.y, radius, 0, 2 * Math.PI);
  
      context2d.fillStyle = fillStyle;
      context2d.fill();
  }
  export function fillText(
    context2d: CanvasRenderingContext2D,
    text: string,
    position: Maths.Vector2,
    fillStyle: string,
    alignment: string = "start",
    baseline: string = "alphabetic"
  ) {
    context2d.textAlign = alignment;
    context2d.textBaseline = baseline;
    context2d.fillStyle = fillStyle;
    context2d.fillText(text, position.x, position.y);
  }
  export function strokeLine(context2d: CanvasRenderingContext2D, p1: Maths.Vector2, p2: Maths.Vector2, strokeStyle: string) {
    context2d.strokeStyle = strokeStyle;
    context2d.beginPath();
    context2d.moveTo(p1.x, p1.y);
    context2d.lineTo(p2.x, p2.y);
    context2d.stroke();
  }
  export function strokePolyline(context2d: CanvasRenderingContext2D, points: Maths.Vector2[], strokeStyle: string) {
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
}

namespace ArrayUtils {
  export function arraySliceAll<T>(predicate: (x: T) => boolean, array: T[], sliceStartIndex: number, sliceLength: number) {
    Debug.assert(sliceStartIndex >= 0);
    Debug.assert((sliceStartIndex + sliceLength) <= array.length);
  
    for (let i = sliceStartIndex; i < (sliceStartIndex + sliceLength); i++) {
      if (!predicate(array[i])) {
        return false;
      }
    }
  
    return true;
  }
  export function generateArray<T>(arrayLength: number, genElementFunc: (index: number) => T): T[] {
    let array = new Array<T>(arrayLength);
  
    for(let i = 0; i < arrayLength; i++) {
      array[i] = genElementFunc(i);
    }
  
    return array;
  }
  export function combineArrays<T1, T2, TR>(arr1: T1[], arr2: T2[], combineFunc: (e1: T1, e2: T2) => TR): TR[] {
    Debug.assert(arr1.length === arr2.length);
  
    let result = new Array<TR>(arr1.length);
  
    for(let i = 0; i < result.length; i++) {
      result[i] = combineFunc(arr1[i], arr2[i]);
    }
  
    return result;
  }
}

namespace Gemini {
  export function loadGeminiBalances(apiKey: string, apiSecret: string) {
    const payload = {
      request: "/v1/balances",
      nonce: nextNonce()
    };
  
    return callGeminiPrivateApi(apiKey, apiSecret, "https://api.gemini.com/v1/balances", payload)
      .then(response => {
        if (!response.ok) {
          console.log("Error fetching data from Gemini.");
          return;
        }
  
        return response.json();
      }).then(json => {
        const findBalanceObj = (currency: string) => (json as Array<any>).find(balanceObj => balanceObj.currency === currency);
        
        return {
          USD: findBalanceObj("USD").available,
          BTC: findBalanceObj("BTC").available,
          ETH: findBalanceObj("ETH").available
        };
      });
  }
  export function buyCurrencyThroughGemini(apiKey: string, apiSecret: string, symbol: string, amount: number, price: number) {
    geminiNewOrder(apiKey, apiSecret, symbol, "buy", amount, price);
  }
  export function sellCurrencyThroughGemini(apiKey: string, apiSecret: string, symbol: string, amount: number, price: number) {
    geminiNewOrder(apiKey, apiSecret, symbol, "sell", amount, price);
  }
  export function geminiNewOrder(apiKey: string, apiSecret: string, symbol: string, side: string, amount: number, price: number) {
    const nonce = nextNonce();
    const clientOrderId = nonce.toString();
  
    const payload = {
      request: "/v1/order/new",
      nonce: nonce,
      client_order_id: clientOrderId,
      symbol: symbol,
      amount: amount.toString(),
      price: price.toString(),
      side: side,
      type: "exchange limit",
      options: ["immediate-or-cancel"]
    };
  
    return callGeminiPrivateApi(apiKey, apiSecret, "https://api.gemini.com/v1/order/new", payload);
  }
  
  export function callGeminiPrivateApi(apiKey: string, apiSecret: string, url: string, payload: any) {
    const jsonPayload = JSON.stringify(payload);
    const base64JsonPayload = btoa(jsonPayload);
    const hashedSignatureBytes = HmacSHA384(base64JsonPayload, apiSecret);
    const signature = enc.Hex.stringify(hashedSignatureBytes);
  
    const proxyUrl = "http://localhost:8080/" + url;
  
    return fetch(proxyUrl, {
      method: "POST",
      headers: {
        "X-GEMINI-APIKEY": apiKey,
        "X-GEMINI-PAYLOAD": base64JsonPayload,
        "X-GEMINI-SIGNATURE": signature
      },
      body: ""
    });
  }
}

namespace CryptoCompare {
  export function loadAggregate1MinCandlesticks(fromSymbol: string, toSymbol: string, exchangeName: string, minutesPerCandlestick: number): Promise<TradeAnalysis> {
    return fetch(`https://min-api.cryptocompare.com/data/histominute?fsym=${fromSymbol}&tsym=${toSymbol}&aggregate=${minutesPerCandlestick}&e=${exchangeName}`)
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
  
        return new TradeAnalysis(fromSymbol + toSymbol, exchangeName, `${minutesPerCandlestick}m`, openTimes, opens, highs, lows, closes, volumes);
      });
  }
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

  heikinOpens: number[];
  heikinHighs: number[];
  heikinLows: number[];
  heikinCloses: number[];

  isLocalMinima: boolean[];
  isLocalMaxima: boolean[];

  linRegSlopePctClose: number[];
  linRegSlopePctCloseConcavity: number[];
  linRegSlopePctCloseMulVolumeMean: number[];

  sma20: number[];
  sma1stDerivative: number[];
  sma2ndDerivative: number[];

  stochasticClose: number[];
  stochasticVolume: number[];

  isVolumeAbnormal: boolean[];
  didVolumeDrop: boolean[];

  bullishness: number[];

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

      this.calculateHeikinAshiCandlesticks();

      //this.isGreens = areConsecutiveBullishCandlesticks(4, this.opens, this.closes);
      const extremaRadius = 3;
      this.isLocalMinima = areLocalMinima(extremaRadius, this.lows);
      this.isLocalMaxima = areLocalMaxima(extremaRadius, this.highs);
      consolidateAdjacentExtrema(this.lows, this.isLocalMinima, this.highs, this.isLocalMaxima);

      const linRegLookbackLength = 8;
      this.linRegSlopePctClose = lineOfBestFitPercentCloseSlopes(this.closes, linRegLookbackLength);
      this.linRegSlopePctCloseConcavity = Maths.movingSecondDerivative(
        this.linRegSlopePctClose, 1
      );
      this.linRegSlopePctCloseMulVolumeMean = ArrayUtils.combineArrays(
        this.linRegSlopePctClose,
        Maths.laggingReduce(this.volumes, linRegLookbackLength, Maths.meanArraySlice),
        (e1, e2) => e1 * e2
      );

      this.sma20 = Maths.laggingSimpleMovingAverage(this.closes, linRegLookbackLength);
      this.sma1stDerivative = Maths.movingDerivative(this.sma20, 1);
      this.sma2ndDerivative = Maths.movingSecondDerivative(this.sma20, 1);

      this.stochasticClose = Maths.stochasticOscillator(this.closes, linRegLookbackLength);
      this.stochasticVolume = Maths.stochasticOscillator(this.volumes, linRegLookbackLength);

      this.isVolumeAbnormal = Maths.laggingReduce(this.volumes, linRegLookbackLength, (values, startIndex, count) => {
        if(count < linRegLookbackLength) { return false; }

        const mean = Maths.meanArraySlice(values, startIndex, count - 1);
        const stdev = Maths.populationStandardDeviation(values, startIndex, count - 1);

        return !Maths.inRangeInclusive(
          this.volumes[startIndex + count - 1],
          mean - (3 * stdev),
          mean + (3 * stdev)
        );
      });

      this.didVolumeDrop = new Array<boolean>(this.candlestickCount);
      for(let i = 0; i < this.candlestickCount; i++) {
        this.didVolumeDrop[i] = (i > 0) ? (Maths.divNoNaN(this.volumes[i], this.volumes[i - 1]) < 0.5) : false;
      }

      this.bullishness = new Array<number>(this.candlestickCount);
      for(let i = 0; i < this.candlestickCount; i++) {
        const signedBodyLengthPctClose = (this.closes[i] - this.opens[i]) / this.closes[i];
        const signedBodyLengthPctCloseMulVolume = signedBodyLengthPctClose * this.volumes[i];

        this.bullishness[i] = (
          (0.0005 * signedBodyLengthPctCloseMulVolume) +
          (1 * this.linRegSlopePctClose[i])
        );
      }
  }

  get candlestickCount() {
    return this.opens.length;
  }

  private calculateHeikinAshiCandlesticks() {
    this.heikinOpens = new Array<number>(this.candlestickCount);
    this.heikinHighs = new Array<number>(this.candlestickCount);
    this.heikinLows = new Array<number>(this.candlestickCount);
    this.heikinCloses = new Array<number>(this.candlestickCount);

    if(this.candlestickCount === 0) { return; }

    this.heikinOpens[0] = this.opens[0];
    this.heikinHighs[0] = this.highs[0];
    this.heikinLows[0] = this.lows[0];
    this.heikinCloses[0] = this.closes[0];
    
    for(let i = 1; i < this.candlestickCount; i++) {
      this.heikinCloses[i] = (this.opens[i] + this.highs[i] + this.lows[i] + this.closes[i]) / 4;
      this.heikinOpens[i] = (this.heikinOpens[i - 1] + this.heikinCloses[i - 1]) / 2;
      this.heikinHighs[i] = Math.max(this.highs[i], this.heikinOpens[i], this.heikinCloses[i]);
      this.heikinLows[i] = Math.min(this.lows[i], this.heikinOpens[i], this.heikinCloses[i]);
    }
  }
}

class TradingAlgorithmState {
  isInTrade: boolean;
  stopLossPrice: number;
  minTakeProfitPrice: number;
  trailingStopLossPrice: number;
}

function updateTradingAlgorithm(
  state: TradingAlgorithmState,
  tradeAnalysis: TradeAnalysis,
  curCandlestickIndex: number,
  tryBuy: () => boolean,
  trySell: () => boolean
) {
  const curPrice = tradeAnalysis.closes[curCandlestickIndex];

  const shouldEnter3Extrema = () => {
    const extrema = areMinimaMaximaToExtremas(
      tradeAnalysis.lows, tradeAnalysis.isLocalMinima, tradeAnalysis.highs, tradeAnalysis.isLocalMaxima
    ).filter(x => x.index <= curCandlestickIndex);

    if(extrema.length < 3) { return false; }

    const e1 = extrema[extrema.length - 3];
    const e2 = extrema[extrema.length - 2];
    const e3 = extrema[extrema.length - 1];
    
    if(!(
      (e1.type === ExtremaType.MINIMA) &&
      (e2.type === ExtremaType.MAXIMA) &&
      (e3.type === ExtremaType.MINIMA)
    )) {
      return false;
    }
    
    const lowsPriceIncreasePercent = (e3.value - e1.value) / e1.value;
    const lowsPriceIncreasePercentPerCandlestick = lowsPriceIncreasePercent / (e3.index - e1.index);
    const priceIncreasePercentPerCandlestickThreshold = 0.05 / 100;

    return lowsPriceIncreasePercentPerCandlestick >= priceIncreasePercentPerCandlestickThreshold;
  };
  const shouldEnter4Extrema = () => {
    const extrema = areMinimaMaximaToExtremas(
      tradeAnalysis.lows, tradeAnalysis.isLocalMinima, tradeAnalysis.highs, tradeAnalysis.isLocalMaxima
    ).filter(x => x.index <= curCandlestickIndex);

    if(extrema.length < 4) { return false; }

    const e1 = extrema[extrema.length - 4];
    const e2 = extrema[extrema.length - 3];
    const e3 = extrema[extrema.length - 2];
    const e4 = extrema[extrema.length - 1];
    
    if(!(
      (e1.type === ExtremaType.MAXIMA) &&
      (e2.type === ExtremaType.MINIMA) &&
      (e3.type === ExtremaType.MAXIMA) &&
      (e4.type === ExtremaType.MINIMA)
    )) {
      return false;
    }
    
    const lowsPriceIncreasePercent = (e4.value - e2.value) / e2.value;
    const lowsPriceIncreasePercentPerCandlestick = lowsPriceIncreasePercent / (e4.index - e2.index);

    const highsPriceIncreasePercent = (e3.value - e1.value) / e3.value;
    const highsPriceIncreasePercentPerCandlestick = highsPriceIncreasePercent / (e3.index - e1.index);

    const priceIncreasePercentThresholdPerCandlestick = 0.05 / 100;

    return (
      (lowsPriceIncreasePercentPerCandlestick >= priceIncreasePercentThresholdPerCandlestick) &&
      (highsPriceIncreasePercentPerCandlestick >= priceIncreasePercentThresholdPerCandlestick)
    );
  };
  const shouldEnter2 = () => {
    const isBearishMinus2 = tradeAnalysis.heikinCloses[curCandlestickIndex - 2] < tradeAnalysis.heikinOpens[curCandlestickIndex - 2];
    const isBullishMinus1 = tradeAnalysis.heikinCloses[curCandlestickIndex - 1] > tradeAnalysis.heikinOpens[curCandlestickIndex - 1];
    
    const signedBodyHeight = tradeAnalysis.heikinCloses[curCandlestickIndex] - tradeAnalysis.heikinOpens[curCandlestickIndex];
    const signedBodyHeightPctOfOpen = signedBodyHeight / tradeAnalysis.heikinOpens[curCandlestickIndex];
    const isGreenNonHeikin = tradeAnalysis.closes[curCandlestickIndex] > tradeAnalysis.opens[curCandlestickIndex];
    const isBullishEnough = signedBodyHeightPctOfOpen > (0.25 / 100);

    return isBearishMinus2 && isBullishMinus1 && isGreenNonHeikin && isBullishEnough;
  };
  const shouldExit = () => {
    return curPrice <= state.trailingStopLossPrice;
  };

  if(!state.isInTrade) {
    // look for entry
    if(curCandlestickIndex === 0) { return; }

    if(shouldEnter4Extrema()) {
      const stopLossDropPercent = 1 / 100;
      const minTakeProfitRisePercent = 1 / 100;

      state.stopLossPrice = (1 - stopLossDropPercent) * curPrice;
      state.minTakeProfitPrice = (1 + minTakeProfitRisePercent) * curPrice;
      state.trailingStopLossPrice = state.stopLossPrice;

      if(tryBuy()) {
        state.isInTrade = true;
      }
    }
  } else {
    if(shouldExit()) {
      if(trySell()) {
        state.isInTrade = false;
      }
    } else if(curPrice >= state.minTakeProfitPrice) {
      const trailingStopLossPercentLag = 1 / 100;
      state.trailingStopLossPrice = Math.max((1 - trailingStopLossPercentLag) * curPrice, state.minTakeProfitPrice);
    }
  }
}

function areConsecutiveBullishCandlesticks(windowSize: number, opens: number[], closes: number[]): boolean[] {
  Debug.assert(windowSize >= 1);
  Debug.assert(opens.length === closes.length);

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

enum ExtremaType {
  MINIMA,
  MAXIMA
}

function areLocalMinima(valueRadius: number, values: number[]): boolean[] {
  Debug.assert(valueRadius >= 1);

  const windowSize = (2 * valueRadius) + 1;
  const maxIndex = values.length - 1;
  return values.map((value, index) => ((index >= valueRadius) && (index <= (maxIndex - valueRadius)))
    ? ArrayUtils.arraySliceAll(otherValue => (otherValue >= value), values, index - valueRadius, windowSize)
    : false
  );
}
function areLocalMaxima(valueRadius: number, values: number[]): boolean[] {
  Debug.assert(valueRadius >= 1);

  const windowSize = (2 * valueRadius) + 1;
  const maxIndex = values.length - 1;
  return values.map((value, index) => ((index >= valueRadius) && (index <= (maxIndex - valueRadius)))
    ? ArrayUtils.arraySliceAll(otherValue => (otherValue <= value), values, index - valueRadius, windowSize)
    : false
  );
}
function consolidateAdjacentExtrema(
  valuesForMinima: number[],
  areLocalMinima: boolean[],
  valuesForMaxima: number[],
  areLocalMaxima: boolean[]
) {
  const valueCount = valuesForMinima.length;
  let lastExtremaType: ExtremaType | null = null;
  let lastExtremaIndex = -1;

  for(let i = 0; i < valueCount; i++) {
    if(areLocalMinima[i]) {
      if(lastExtremaType !== ExtremaType.MINIMA) {
        // This minima is NOT adjacent to another minima.
        lastExtremaIndex = i;
      } else {
        // Only retain the lower (or later if equal) of the two minima.
        if(valuesForMinima[i] <= valuesForMinima[lastExtremaIndex]) {
          areLocalMinima[lastExtremaIndex] = false;        
          lastExtremaIndex = i;
        } else {
          areLocalMinima[i] = false;
        }
      }

      lastExtremaType = ExtremaType.MINIMA;            
    }
    
    // not else-if because a candlestick can be a low AND a high
    if(areLocalMaxima[i]) {
      if(lastExtremaType !== ExtremaType.MAXIMA) {
        // This maxima is NOT adjacent to another maxima.
        lastExtremaIndex = i;
      } else {
        // Only retain the higher (or later if equal) of the two maxima.
        if(valuesForMaxima[i] >= valuesForMaxima[lastExtremaIndex]) {
          areLocalMaxima[lastExtremaIndex] = false;        
          lastExtremaIndex = i;
        } else {
          areLocalMaxima[i] = false;
        }
      }

      lastExtremaType = ExtremaType.MAXIMA; 
    }
  }
}

class Extrema {
  constructor(public type: ExtremaType, public value: number, public index: number) {}
}

function areMinimaMaximaToExtremas(
  valuesForMinima: number[],
  areLocalMinima: boolean[],
  valuesForMaxima: number[],
  areLocalMaxima: boolean[]
): Extrema[] {
  let extrema = new Array<Extrema>();

  const valueCount = valuesForMinima.length;
  for(let i = 0; i < valueCount; i++) {
    if(areLocalMinima[i]) {
      extrema.push(new Extrema(ExtremaType.MINIMA, valuesForMinima[i], i));
    }

    if(areLocalMaxima[i]) {
      extrema.push(new Extrema(ExtremaType.MAXIMA, valuesForMaxima[i], i));
    }
  }

  return extrema;
}

class Settings {
  constructor(
    public geminiApiKey: string,
    public geminiApiSecret: string,

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

const MARKER_VERTICAL_MARGIN = 5;

enum CandlestickMarkerType {
  SQUARE,
  CIRCLE,
  TRIANGLE_UP,
  TRIANGLE_DOWN,
  LETTER
}
enum CandlestickMarkerPosition {
  ABOVE,
  BELOW
}
class CandlestickMarker {
  constructor(
    public type: CandlestickMarkerType,
    public position: CandlestickMarkerPosition,
    public fillStyle: string,
    public letter?: string
  ) {}
}

const COLUMN_HIGHLIGHT_FILL_STYLE = "rgba(0, 0, 0, 0.2)";

function iFromRightToColumnX(chartWidth: number, columnWidth: number, scrollOffsetInColumns: number, iFromRight: number): number {
  const rightmostColumnX = chartWidth - columnWidth;
  const columnX = rightmostColumnX - ((iFromRight + scrollOffsetInColumns) * columnWidth);

  return columnX;
}

interface CandlestickChartProps {
  tradeAnalysis: TradeAnalysis | null;
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
  markers?: CandlestickMarker[][];
  width: number;
  height: number;
  columnWidth: number;
  columnHorizontalPadding: number;
  scrollOffsetInColumns: number;
  highlightedColumnIndex?: number;
}
class CandlestickChart extends React.Component<CandlestickChartProps, {}> {
  canvasElement: HTMLCanvasElement | null;
  context2d: CanvasRenderingContext2D | null;

  get minPrice(): number {
    if (!this.props.tradeAnalysis) { return 0; }
    return 0.99 * Math.min(...this.props.lows);
  }
  get maxPrice(): number {
    if (!this.props.tradeAnalysis) { return 0; }
    return 1.01 * Math.max(...this.props.highs);
  }

  iToIFromRight(i: number): number {
    return this.iFromRightToI(i);
  }
  iFromRightToI(iFromRight: number): number {
    if(!this.props.tradeAnalysis) { return 0; }
    
    const rightmostCandlestickIndex = this.props.tradeAnalysis.candlestickCount - 1;
    const i = rightmostCandlestickIndex - iFromRight;

    return i;
  }
  priceToY(price: number): number {
    const priceRange = this.maxPrice - this.minPrice;
    const yPercentFromBottom = (price - this.minPrice) / priceRange;
    const yFromBottom = yPercentFromBottom * this.props.height;
    const yFromTop = this.props.height - yFromBottom;
    return yFromTop;
  }
  drawCandlestick(iFromRight: number) {
    if(!this.props.tradeAnalysis || !this.context2d) { return; }
    
    const i = this.iFromRightToI(iFromRight);
    const columnX = iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, iFromRight);

    const open = this.props.opens[i];
    const high = this.props.highs[i];
    const low = this.props.lows[i];
    const close = this.props.closes[i];

    const maxVolume = Math.max(...this.props.volumes);
    const a = 1;//this.props.volumes[i] / maxVolume;
    const fillStyle = (close > open) ? `rgba(0, 128, 0, ${a})` : `rgba(255, 0, 0, ${a})`;

    const bodyLeft = columnX + this.props.columnHorizontalPadding;
    const bodyRight = (columnX + this.props.columnWidth) - this.props.columnHorizontalPadding;
    const bodyWidth = bodyRight - bodyLeft;
    const bodyMaxPrice = Math.max(open, close);
    const bodyMinPrice = Math.min(open, close);
    const bodyTop = this.priceToY(bodyMaxPrice);
    const bodyBottom = this.priceToY(bodyMinPrice);
    const bodyHeight = bodyBottom - bodyTop;

    const wickLeft = columnX + (this.props.columnWidth / 2);
    const wickTop = this.priceToY(high);
    const wickBottom = this.priceToY(low);
    const wickHeight = wickBottom - wickTop;

    // body
    Graphics.fillRect(this.context2d, new Maths.Vector2(bodyLeft, bodyTop), bodyWidth, bodyHeight, fillStyle);
    
    // wick
    Graphics.fillRect(this.context2d, new Maths.Vector2(wickLeft, wickTop), 1, wickHeight, fillStyle);
  }
  drawLinearRegressionLine(windowSize: number) {
    if (this.context2d === null) { return; }
    if (this.props.closes.length < windowSize) { return; }

    const linRegPoints = ArrayUtils.generateArray(windowSize, iFromStart => {
      const i = (this.props.closes.length - windowSize) + iFromStart;
      return new Maths.Vector2(iFromStart, this.props.closes[i]);
    });
    const lineOfBestFit = Maths.linearLeastSquares(linRegPoints);

    const lineStartClose = this.props.closes[this.props.closes.length - windowSize];
    const lineStartPoint = new Maths.Vector2(
      iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, windowSize - 1) + (this.props.columnWidth / 2),
      this.priceToY(lineOfBestFit.b)
    );
    const lineEndPoint = new Maths.Vector2(
      iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, 0) + (this.props.columnWidth / 2),
      this.priceToY((lineOfBestFit.m * (windowSize - 1)) + lineOfBestFit.b)
    );
    Graphics.strokeLine(this.context2d, lineStartPoint, lineEndPoint, "rgba(0, 0, 0, 0.3)");
  }
  drawMarker(marker: CandlestickMarker, columnX: number, topY: number) {
    if ((this.context2d === null)) { return; }
    
    const markerWidth = this.props.columnWidth - (2 * this.props.columnHorizontalPadding);
    const markerHeight = markerWidth;
    const markerLeftX = columnX + this.props.columnHorizontalPadding;
    const markerRightX = columnX + this.props.columnWidth - this.props.columnHorizontalPadding;
    const markerCenterX = columnX + (this.props.columnWidth / 2);
    const fillStyle = marker.fillStyle;

    switch(marker.type) {
      case CandlestickMarkerType.CIRCLE:
        const circleRadius = markerWidth / 2;
        const circlePos = new Maths.Vector2(markerCenterX, topY + circleRadius);
        Graphics.fillCircle(this.context2d, circlePos, circleRadius, fillStyle);
        break;
      case CandlestickMarkerType.SQUARE:
        const squarePos = new Maths.Vector2(markerLeftX, topY);
        Graphics.fillRect(this.context2d, squarePos, markerWidth, markerHeight, fillStyle);
        break;
      case CandlestickMarkerType.TRIANGLE_UP:
        this.context2d.strokeStyle = fillStyle;
        this.context2d.fillStyle = fillStyle;

        this.context2d.beginPath();
        this.context2d.moveTo(markerLeftX, topY + markerHeight);
        this.context2d.lineTo(markerCenterX, topY);
        this.context2d.lineTo(markerRightX, topY + markerHeight);
        this.context2d.closePath();
        this.context2d.fill();

        break;
      case CandlestickMarkerType.TRIANGLE_DOWN:
        this.context2d.strokeStyle = fillStyle;
        this.context2d.fillStyle = fillStyle;

        this.context2d.beginPath();
        this.context2d.moveTo(markerLeftX, topY);
        this.context2d.lineTo(markerCenterX, topY + markerHeight);
        this.context2d.lineTo(markerRightX, topY);
        this.context2d.closePath();
        this.context2d.fill();

        break;
      case CandlestickMarkerType.LETTER:
        if(!marker.letter) { break; }
        
        const letterPos = new Maths.Vector2(markerLeftX, topY);
        Graphics.fillText(this.context2d, marker.letter, letterPos, fillStyle, "start", "top");
        break;
      default:
        throw new Error("Unknown CandlestickMarkerType");
    }
    
    topY += markerHeight + MARKER_VERTICAL_MARGIN;
  }
  drawToCanvas() {
    if (this.context2d === null) { return; }

    this.context2d.clearRect(0, 0, this.props.width, this.props.height);

    if (this.props.tradeAnalysis) {
      // draw highlighted column
      if (this.props.highlightedColumnIndex !== undefined) {
        const x = iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, this.iToIFromRight(this.props.highlightedColumnIndex));
        const position = new Maths.Vector2(x, 0);
        const fillStyle = COLUMN_HIGHLIGHT_FILL_STYLE;
        Graphics.fillRect(this.context2d, position, this.props.columnWidth, this.props.height, fillStyle);
      }

      // draw candlesticks
      for (let iFromRight = 0; iFromRight < this.props.tradeAnalysis.candlestickCount; iFromRight++) {
        this.drawCandlestick(iFromRight);
      }

      // markers
      if(this.props.markers) {
        for (let iFromRight = 0; iFromRight < this.props.tradeAnalysis.candlestickCount; iFromRight++) {
          const i = this.iFromRightToI(iFromRight);
          const columnX = iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, iFromRight);
  
          const markerWidth = this.props.columnWidth - (2 * this.props.columnHorizontalPadding);
          const markerHeight = markerWidth;
  
          const high = this.props.highs[i];
          const wickTop = this.priceToY(high);
  
          // Draw markers below.
          const low = this.props.lows[i];
          const wickBottom = this.priceToY(low);

          let topY = wickBottom + MARKER_VERTICAL_MARGIN;
          this.props.markers[i].forEach(marker => {
            if ((marker.position !== CandlestickMarkerPosition.BELOW)) { return; }

            this.drawMarker(marker, columnX, topY);
            
            topY += markerHeight + MARKER_VERTICAL_MARGIN;
          });
  
          topY = wickTop - MARKER_VERTICAL_MARGIN - markerHeight;
          this.props.markers[i].forEach(marker => {
            if ((marker.position !== CandlestickMarkerPosition.ABOVE)) { return; }

            this.drawMarker(marker, columnX, topY);
            
            topY -= markerHeight + MARKER_VERTICAL_MARGIN;
          });
        }
      }

      // draw SMA
      const candlestickCount = this.props.tradeAnalysis.candlestickCount;
      const smaPoints = this.props.tradeAnalysis.sma20.map((value, index) => {
        const iFromRight = (candlestickCount - 1) - index;

        return new Maths.Vector2(
          iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, iFromRight) + (this.props.columnWidth / 2),
          this.priceToY(value)
        );
      });
      //strokePolyline(this.context2d, smaPoints, "black");

      // draw linear regression lines
      const linRegWindowSizes = [5, 10, 15, 20, 25, 30, 60];
      linRegWindowSizes.forEach(x => this.drawLinearRegressionLine(x));

      // draw chart title
      const chartTitle = `${this.props.tradeAnalysis.securitySymbol} ${this.props.tradeAnalysis.exchangeName} ${this.props.tradeAnalysis.timeframe}`;
      Graphics.fillText(this.context2d, chartTitle, new Maths.Vector2(10, 10), "rgb(0, 0, 0)");
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
    return <canvas ref={domElement => this.canvasElement = domElement} width={this.props.width} height={this.props.height} />;
  }
}

interface HistogramChartProps {
  chartTitle: string;
  values: number[];
  colors: string[];
  width: number;
  height: number;
  columnWidth: number;
  columnHorizontalPadding: number;
  scrollOffsetInColumns: number;
  highlightedColumnIndex?: number;
}
class HistogramChart extends React.Component<HistogramChartProps, {}> {
  canvasElement: HTMLCanvasElement | null;
  context2d: CanvasRenderingContext2D | null;

  get maxValue(): number {
    if (!this.props.values) { return 0; }
    return Math.max(...this.props.values);
  }

  iToIFromRight(i: number): number {
    return this.iFromRightToI(i);
  }
  iFromRightToI(iFromRight: number): number {
    const rightmostCandlestickIndex = this.props.values.length - 1;
    const i = rightmostCandlestickIndex - iFromRight;

    return i;
  }
  valueToY(value: number): number {
    const yPercentFromBottom = value / this.maxValue;
    const yFromBottom = yPercentFromBottom * this.props.height;
    const yFromTop = this.props.height - yFromBottom;
    return yFromTop;
  }
  drawToCanvas() {
    if (this.context2d === null) { return; }

    this.context2d.clearRect(0, 0, this.props.width, this.props.height);

    if (this.props.values) {
      // draw highlighted column
      if (this.props.highlightedColumnIndex !== undefined) {
        
        const x = iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, this.iToIFromRight(this.props.highlightedColumnIndex));
        const position = new Maths.Vector2(x, 0);
        const fillStyle = COLUMN_HIGHLIGHT_FILL_STYLE;
        Graphics.fillRect(this.context2d, position, this.props.columnWidth, this.props.height, fillStyle);
      }

      // draw bars
      for (let iFromRight = 0; iFromRight < this.props.values.length; iFromRight++) {
        const i = this.iFromRightToI(iFromRight);
        const columnX = iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, iFromRight);

        const value = this.props.values[i];

        const fillStyle = this.props.colors ? this.props.colors[i] : "black";

        const bodyLeft = columnX + this.props.columnHorizontalPadding;
        const bodyRight = (columnX + this.props.columnWidth) - this.props.columnHorizontalPadding;
        const bodyWidth = bodyRight - bodyLeft;
        const bodyTop = this.valueToY(value);
        const bodyBottom = this.valueToY(0);
        const bodyHeight = bodyBottom - bodyTop;

        // body
        Graphics.fillRect(this.context2d, new Maths.Vector2(bodyLeft, bodyTop), bodyWidth, bodyHeight, fillStyle);
      }

      // draw chart title
      Graphics.fillText(this.context2d, this.props.chartTitle, new Maths.Vector2(10, 10), "rgb(0, 0, 0)");
    }
  }

  componentDidMount() {
    if (this.canvasElement === null) { return; }

    this.context2d = this.canvasElement.getContext("2d");
    if (this.context2d === null) { return; }

    this.drawToCanvas();
  }
  componentDidUpdate(prevProps: HistogramChartProps, prevState: {}) {
    if (this.context2d === null) { return; }
    
    this.drawToCanvas();
  }

  render() {
    return <canvas ref={domElement => this.canvasElement = domElement} width={this.props.width} height={this.props.height} />;
  }
}

interface LineChartProps {
  chartTitle: string;
  values: number[];
  width: number;
  height: number;
  columnWidth: number;
  columnHorizontalPadding: number;
  scrollOffsetInColumns: number;
  highlightedColumnIndex?: number;
}
class LineChart extends React.Component<LineChartProps, {}> {
  canvasElement: HTMLCanvasElement | null;
  context2d: CanvasRenderingContext2D | null;

  iToIFromRight(i: number): number {
    return this.iFromRightToI(i);
  }
  iFromRightToI(iFromRight: number): number {
    const rightmostCandlestickIndex = this.props.values.length - 1;
    const i = rightmostCandlestickIndex - iFromRight;

    return i;
  }
  valueToY(value: number): number {
    const maxAbsValue = Math.max(...this.props.values.map(Math.abs));
    const minValue = -maxAbsValue;
    const maxValue = maxAbsValue;

    const valueRange = maxValue - minValue;
    const yPercentFromBottom = (value - minValue) / valueRange;
    const yFromBottom = yPercentFromBottom * this.props.height;
    const yFromTop = this.props.height - yFromBottom;

    return yFromTop;
  }
  getPolyline(): Maths.Vector2[] {
    let points = new Array<Maths.Vector2>(this.props.values.length);

    for (let iFromRight = 0; iFromRight < points.length; iFromRight++) {
      const i = this.iFromRightToI(iFromRight);
      const columnX = iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, iFromRight);
      const value = this.props.values[i];

      const point = new Maths.Vector2(columnX + (this.props.columnWidth / 2), this.valueToY(value));
      points[i] = point;
    }

    return points;
  }
  drawToCanvas() {
    if (this.context2d === null) { return; }

    this.context2d.clearRect(0, 0, this.props.width, this.props.height);

    // draw highlighted column
    if (this.props.highlightedColumnIndex !== undefined) {
      const x = iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, this.iToIFromRight(this.props.highlightedColumnIndex));
      const position = new Maths.Vector2(x, 0);
      const fillStyle = COLUMN_HIGHLIGHT_FILL_STYLE;
      Graphics.fillRect(this.context2d, position, this.props.columnWidth, this.props.height, fillStyle);
    }

    // draw x-axis
    const xAxisY = this.valueToY(0);
    Graphics.strokeLine(this.context2d, new Maths.Vector2(0, xAxisY), new Maths.Vector2(this.props.width, xAxisY), "rgb(0, 0, 0)");

    const polyline = this.getPolyline();
    Graphics.strokePolyline(this.context2d, polyline, "rgb(0, 0, 0)");
    
    // draw chart title
    Graphics.fillText(this.context2d, this.props.chartTitle, new Maths.Vector2(10, 10), "rgb(0, 0, 0)");
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
    return <canvas ref={domElement => this.canvasElement = domElement} width={this.props.width} height={this.props.height} />;
  }
}


function lineOfBestFitPercentCloseSlopes(closes: number[], linRegCandleCount: number): number[] {
  return closes.map((close, closeIndex) => {
    const startCandlestickIndex = Math.max(closeIndex - (linRegCandleCount - 1), 0);
    const pointCount = 1 + (closeIndex - startCandlestickIndex);

    if(pointCount < linRegCandleCount) { return 0; }

    let points = new Array<Maths.Vector2>(pointCount);

    for(let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      points[pointIndex] = new Maths.Vector2(pointIndex, closes[startCandlestickIndex + pointIndex]);
    }

    return Maths.linearLeastSquares(points).m / close;
  });
}

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

  buyCurrency() {
    if(!this.state.tradeAnalysis) { return; }

    const lastPrice = this.state.tradeAnalysis.closes[this.state.tradeAnalysis.candlestickCount - 1];

    const buyCurrencyAmount = parseFloat((parseFloat(this.state.buyUsdAmount) / lastPrice).toFixed(5));
    if(isNaN(buyCurrencyAmount)) { return; }

    const price = lastPrice * 2;

    Gemini.buyCurrencyThroughGemini(this.state.geminiApiKey, this.state.geminiApiSecret, `${this.state.currentCurrency}USD`, buyCurrencyAmount, price);
  }
  sellCurrency() {
    if(!this.state.tradeAnalysis) { return; }

    const lastPrice = this.state.tradeAnalysis.closes[this.state.tradeAnalysis.candlestickCount - 1];
    
    const sellCurrencyAmount = parseFloat(this.state.sellCurrencyAmount);
    if(isNaN(sellCurrencyAmount)) { return; }

    const price = lastPrice / 2;

    Gemini.sellCurrencyThroughGemini(this.state.geminiApiKey, this.state.geminiApiSecret, `${this.state.currentCurrency}USD`, sellCurrencyAmount, price);
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
    SMS.sendTextWithTwilio(
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
          const fakeBuyCurrency = () => true;
          const fakeSellCurrency = () => true;

          for(let i = 0; i < (tradeAnalysis.candlestickCount - 1); i++) {
            const wasInTrade = this.tradingAlgoState.isInTrade;
            updateTradingAlgorithm(this.tradingAlgoState, tradeAnalysis, i, fakeBuyCurrency, fakeSellCurrency);
            if(!wasInTrade && this.tradingAlgoState.isInTrade) { this.entryPointOpenTimes.push(tradeAnalysis.openTimes[i]); }
            if(wasInTrade && !this.tradingAlgoState.isInTrade) { this.exitPointOpenTimes.push(tradeAnalysis.openTimes[i]); }
          }
        }

        const tryBuyCurrency = () => {
          try {
            //this.buyCurrency();
            SMS.sendTextWithTwilio(
              this.state.twilioAccountSid,
              this.state.twilioAuthToken,
              this.state.fromPhoneNumber,
              this.state.toPhoneNumber,
              "Buy"
            );
            console.log("Try real buy!");
            return true;
          } catch(e) {
            return false;
          }
        };
        const trySellCurrency = () => {
          try {
            //this.sellCurrency();
            SMS.sendTextWithTwilio(
              this.state.twilioAccountSid,
              this.state.twilioAuthToken,
              this.state.fromPhoneNumber,
              this.state.toPhoneNumber,
              "Sell."
            );
            console.log("Try real sell!");
            return true;
          } catch(e) {
            return false;
          }
        };

        const wasInTrade = this.tradingAlgoState.isInTrade;
        updateTradingAlgorithm(this.tradingAlgoState, tradeAnalysis, tradeAnalysis.candlestickCount - 1, tryBuyCurrency, trySellCurrency);
        if(!wasInTrade && this.tradingAlgoState.isInTrade) {
          this.entryPointOpenTimes.push(mostRecentOpenTime);

          SMS.sendTextWithTwilio(
            this.state.twilioAccountSid,
            this.state.twilioAuthToken,
            this.state.fromPhoneNumber,
            this.state.toPhoneNumber,
            "Entry signal."
          );
        }
        if(wasInTrade && !this.tradingAlgoState.isInTrade) {
          this.exitPointOpenTimes.push(mostRecentOpenTime);

          SMS.sendTextWithTwilio(
            this.state.twilioAccountSid,
            this.state.twilioAuthToken,
            this.state.fromPhoneNumber,
            this.state.toPhoneNumber,
            "Exit signal."
          );
        }

        if(tradeAnalysis.isVolumeAbnormal[tradeAnalysis.candlestickCount - 1]) {
          SMS.sendTextWithTwilio(
            this.state.twilioAccountSid,
            this.state.twilioAuthToken,
            this.state.fromPhoneNumber,
            this.state.toPhoneNumber,
            "Abnormal volume."
          );
        }
      }
    });
  }

  componentDidMount() {
    const settings = loadSettings();
    if (settings) {
      this.setState({
        geminiApiKey: settings.geminiApiKey,
        geminiApiSecret: settings.geminiApiSecret,

        twilioAccountSid: settings.twilioAccountSid,
        twilioAuthToken: settings.twilioAuthToken,
        fromPhoneNumber: settings.fromPhoneNumber,
        toPhoneNumber: settings.toPhoneNumber
      });
    }

    if(settings && settings.twilioAccountSid) {
      this.reloadCandlesticks();
      this.refreshCandlesticksIntervalHandle = setInterval(
        this.reloadCandlesticks.bind(this),
        1000 * this.refreshIntervalSeconds
      );
    }

    if(settings && settings.geminiApiKey) {
      Gemini.loadGeminiBalances(settings.geminiApiKey, settings.geminiApiSecret)
        .then(json => {
          this.setState({
            usdBalance: json.USD,
            btcBalance: json.BTC,
            ethBalance: json.ETH
          });
        });
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
    
    const columnWidth = 10;
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

      if(this.state.tradeAnalysis.isLocalMinima[i]) {
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
      }
    }

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
          chartTitle="Lin. Reg. % Close Slope"
          values={this.state.tradeAnalysis.linRegSlopePctClose}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
          highlightedColumnIndex={highlightedColumnIndex}
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
          chartTitle="SMA 1st d/dt"
          values={this.state.tradeAnalysis.sma1stDerivative}
          width={800}
          height={100}
          columnWidth={columnWidth}
          columnHorizontalPadding={columnHorizontalPadding}
          scrollOffsetInColumns={scrollOffsetInColumns}
        />
        <LineChart
          chartTitle="SMA 2nd d/dt"
          values={this.state.tradeAnalysis.sma2ndDerivative}
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
    const buyCurrency = this.buyCurrency.bind(this);
    const sellCurrency = this.sellCurrency.bind(this);
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
        <select value={this.state.currentCurrency} onChange={onCurrentCurrencyChange}>
          <option value="BTC">BTC</option>
          <option value="ETH">ETH</option>
        </select>
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

// initialization

let lastNonce = 0;
function nextNonce(): number {
  var newNonce = (new Date()).getTime();
  newNonce = Math.max(newNonce, lastNonce + 1); // Ensure the nonce is monotonically increasing.

  lastNonce = newNonce;

  return newNonce;
}