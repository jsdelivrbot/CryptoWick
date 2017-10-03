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

  heikinOpens: number[];
  heikinHighs: number[];
  heikinLows: number[];
  heikinCloses: number[];

  isLocalMinima: boolean[];
  isLocalMaxima: boolean[];

  lineOfBestFitPercentCloseSlopes: number[];
  lineOfBestFitPercentCloseSlopeConcavity: number[];

  sma20: number[];
  sma1stDerivative: number[];
  sma2ndDerivative: number[];

  isBearish: boolean[];

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
      this.isLocalMinima = areLocalMinima(2, this.lows);
      this.isLocalMaxima = areLocalMaxima(2, this.highs);

      this.lineOfBestFitPercentCloseSlopes = lineOfBestFitPercentCloseSlopes(this.closes, 8);
      this.lineOfBestFitPercentCloseSlopeConcavity = movingSecondDerivative(
        this.lineOfBestFitPercentCloseSlopes, 1
      );

      this.sma20 = laggingSimpleMovingAverage(this.closes, 4);
      this.sma1stDerivative = movingDerivative(this.sma20, 1);
      this.sma2ndDerivative = movingSecondDerivative(this.sma20, 1);

      this.isBearish = new Array<boolean>(this.candlestickCount);
      for(let i = 0; i < this.isBearish.length; i++) {
        const isRed = this.closes[i] < this.opens[i];
        const slopeIsNegative = this.lineOfBestFitPercentCloseSlopes[i] < 0;
        const concaveDown = this.lineOfBestFitPercentCloseSlopeConcavity[i] < 0;

        this.isBearish[i] = isRed && slopeIsNegative && concaveDown;
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
function fillText(context2d: CanvasRenderingContext2D, text: string, position: Vector2, fillStyle: string) {
  context2d.fillStyle = fillStyle;
  context2d.fillText(text, position.x, position.y);
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
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
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
    return Math.min(...this.props.lows);
  }
  get maxPrice(): number {
    if (!this.props.tradeAnalysis) { return 0; }
    return Math.max(...this.props.highs);
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

    const open = this.props.opens[i];
    const high = this.props.highs[i];
    const low = this.props.lows[i];
    const close = this.props.closes[i];

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

        const high = this.props.highs[i];
        const wickTop = this.priceToY(high);

        const low = this.props.lows[i];
        const wickBottom = this.priceToY(low);

        const circleRadius = (this.columnWidth / 2) - this.columnHorizontalPadding;
        const circleX = columnX + (this.columnWidth / 2);
        const circleYMarginFromWick = circleRadius + this.markerVerticalMargin;
        const fillStyle = "black";
        
        /*if (this.props.tradeAnalysis.isLocalMinima[i]) {
          const circlePos = new Vector2(circleX, wickBottom + circleYMarginFromWick);
          fillCircle(this.context2d, circlePos, circleRadius, fillStyle);
        }

        if (this.props.tradeAnalysis.isLocalMaxima[i]) {
          const circlePos = new Vector2(circleX, wickTop - circleYMarginFromWick);
          fillCircle(this.context2d, circlePos, circleRadius, fillStyle);
        }*/

        if (this.props.tradeAnalysis.isBearish[i]) {
          const circlePos = new Vector2(circleX, wickTop - circleYMarginFromWick);
          fillCircle(this.context2d, circlePos, circleRadius, fillStyle);
        }
      }

      // draw SMA
      const candlestickCount = this.props.tradeAnalysis.candlestickCount;
      const smaPoints = this.props.tradeAnalysis.sma20.map((value, index) => {
        const iFromRight = (candlestickCount - 1) - index;

        return new Vector2(this.iFromRightToColumnX(iFromRight) + (this.columnWidth / 2), this.priceToY(value));
      });
      strokePolyline(this.context2d, smaPoints, "black");

      // draw chart title
      const chartTitle = `${this.props.tradeAnalysis.securitySymbol} ${this.props.tradeAnalysis.exchangeName} ${this.props.tradeAnalysis.timeframe}`;
      fillText(this.context2d, chartTitle, new Vector2(10, 10), "rgb(0, 0, 0)");
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

interface HistogramChartProps {
  chartTitle: string;
  values: number[];
  colors: string[];
}
class HistogramChart extends React.Component<HistogramChartProps, {}> {
  canvasElement: HTMLCanvasElement | null;
  context2d: CanvasRenderingContext2D | null;

  width = 800;
  height = 100;

  columnWidth = 15;
  columnHorizontalPadding = 1;

  markerVerticalMargin = 5;

  get maxValue(): number {
    if (!this.props.values) { return 0; }
    return Math.max(...this.props.values);
  }

  valueToY(value: number): number {
    const yPercentFromBottom = value / this.maxValue;
    const yFromBottom = yPercentFromBottom * this.height;
    const yFromTop = this.height - yFromBottom;
    return yFromTop;
  }
  drawToCanvas() {
    if (this.context2d === null) { return; }

    this.context2d.clearRect(0, 0, this.width, this.height);

    if (this.props.values) {
      // draw bars
      const rightmostColumnX = this.width - this.columnWidth;
      const rightmostCandlestickIndex = this.props.values.length - 1;
  
      for (let iFromRight = 0; iFromRight < this.props.values.length; iFromRight++) {
        const i = rightmostCandlestickIndex - iFromRight;

        const columnX = rightmostColumnX - (iFromRight * this.columnWidth);

        const value = this.props.values[i];

        const fillStyle = this.props.colors ? this.props.colors[i] : "black";

        const bodyLeft = columnX + this.columnHorizontalPadding;
        const bodyRight = (columnX + this.columnWidth) - this.columnHorizontalPadding;
        const bodyWidth = bodyRight - bodyLeft;
        const bodyTop = this.valueToY(value);
        const bodyBottom = this.valueToY(0);
        const bodyHeight = bodyBottom - bodyTop;

        // body
        fillRect(this.context2d, new Vector2(bodyLeft, bodyTop), bodyWidth, bodyHeight, fillStyle);
      }

      // draw chart title
      fillText(this.context2d, this.props.chartTitle, new Vector2(10, 10), "rgb(0, 0, 0)");
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
    return <canvas ref={domElement => this.canvasElement = domElement} width={this.width} height={this.height} />;
  }
}

interface LineChartProps {
  chartTitle: string;
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
    
    // draw chart title
    fillText(this.context2d, this.props.chartTitle, new Vector2(10, 10), "rgb(0, 0, 0)");
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

    if(pointCount < linRegCandleCount) { return 0; }

    let points = new Array<Vector2>(pointCount);

    for(let pointIndex = 0; pointIndex < pointCount; pointIndex++) {
      points[pointIndex] = new Vector2(pointIndex, closes[startCandlestickIndex + pointIndex]);
    }

    return linearLeastSquares(points).m / close;
  });
}

function movingDerivative(values: number[], h: number): number[] {
  assert(values !== null);
  assert(h > 0);

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
function movingSecondDerivative(values: number[], h: number): number[] {
  assert(values !== null);
  assert(h > 0);

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

function mean(values: number[]): number {
  let valueSum = 0;
  
  for(let i = 0; i < values.length; i++) {
      valueSum += values[i];
  }

  return valueSum / values.length;
}
function meanArraySlice(values: number[], startIndex: number, valueCount: number): number {
  assert(values !== null);
  assert(valueCount >= 1);
  assert((startIndex + valueCount) <= values.length);

  let valueSum = 0;

  const endIndexExclusive = startIndex + valueCount;
  for (let i = startIndex; i < endIndexExclusive; i++) {
      valueSum += values[i];
  }

  return valueSum / valueCount;
}
function laggingSimpleMovingAverage(values: number[], lookbacklength: number): number[] {
  assert(values !== null);
  assert(lookbacklength > 0);

  return values.map((value, currentValueIndex) => {
      const firstValueIndex = Math.max(currentValueIndex - (lookbacklength - 1), 0);
      const valueCount = (currentValueIndex - firstValueIndex) + 1;

      return meanArraySlice(values, firstValueIndex, valueCount);
  });
}
function laggingExponentialMovingAverage(values: number[], lookbacklength: number): number[] {
  assert(values !== null);
  assert(lookbacklength > 0);

  if(values.length === 0) { return new Array<number>(0); }

  const alpha = 2.0 / (lookbacklength + 1); // smoothing factor
  let ema = new Array<number>(values.length);

  ema[0] = values[0];

  for(let i = 1; i < values.length; i++) {
      ema[i] = ((1.0 - alpha) * ema[i - 1]) + (alpha * values[i]);
  }

  return ema;
}

function combineArrays<T1, T2, TR>(arr1: T1[], arr2: T2[], combineFunc: (e1: T1, e2: T2) => TR): TR[] {
  assert(arr1.length === arr2.length);

  let result = new Array<TR>(arr1.length);

  for(let i = 0; i < result.length; i++) {
    result[i] = combineFunc(arr1[i], arr2[i]);
  }

  return result;
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

        //const isEntrySignal = tradeAnalysis.isLocalMinima[tradeAnalysis.candlestickCount - 1];
        const isEntrySignal = false;
        if (isEntrySignal && this.state.twilioAccountSid) {
          sendTextWithTwilio(
            this.state.twilioAccountSid,
            this.state.twilioAuthToken,
            this.state.fromPhoneNumber,
            this.state.toPhoneNumber,
            "Entry signal."
          );
        }

        const isExitSignal = tradeAnalysis.isBearish[tradeAnalysis.candlestickCount - 1];
        if (isExitSignal && this.state.twilioAccountSid) {
          sendTextWithTwilio(
            this.state.twilioAccountSid,
            this.state.twilioAuthToken,
            this.state.fromPhoneNumber,
            this.state.toPhoneNumber,
            "Exit signal."
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
  renderCharts() {
    if(!this.state.tradeAnalysis) { return null; }

    const useHeikinAshiCandlesticks = true;

    const opens = !useHeikinAshiCandlesticks ? this.state.tradeAnalysis.opens : this.state.tradeAnalysis.heikinOpens;
    const highs = !useHeikinAshiCandlesticks ? this.state.tradeAnalysis.highs : this.state.tradeAnalysis.heikinHighs;
    const lows = !useHeikinAshiCandlesticks ? this.state.tradeAnalysis.lows : this.state.tradeAnalysis.heikinLows;
    const closes = !useHeikinAshiCandlesticks ? this.state.tradeAnalysis.closes : this.state.tradeAnalysis.heikinCloses;

    const candlestickColors = this.state.tradeAnalysis
      ? combineArrays(
          opens,
          closes,
          (open, close) => (close > open) ? "green" : "red"
        )
      : [];

      return (
        <div>
          <CandleStickChart
            tradeAnalysis={this.state.tradeAnalysis}
            opens={opens}
            highs={highs}
            lows={lows}
            closes={closes}
            />
          <HistogramChart chartTitle="Volume" values={this.state.tradeAnalysis.volumes} colors={candlestickColors} />

          <LineChart chartTitle="SMA 1st d/dt" values={this.state.tradeAnalysis.sma1stDerivative} />
          <LineChart chartTitle="SMA 2nd d/dt" values={this.state.tradeAnalysis.sma2ndDerivative} />

          <LineChart chartTitle="Lin. Reg. % Close Slope" values={this.state.tradeAnalysis.lineOfBestFitPercentCloseSlopes} />
          <LineChart chartTitle="Lin. Reg. % Close Slope Concavity" values={this.state.tradeAnalysis.lineOfBestFitPercentCloseSlopeConcavity} />
        </div>
      );
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
        {this.renderCharts()}
      </div>
    );
  }
}

export default App;

// initialization
function load15MinCandlesticks(fromSymbol: string, toSymbol: string, exchangeName: string): Promise<TradeAnalysis> {
  const minutesPerCandlestick = 15;
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