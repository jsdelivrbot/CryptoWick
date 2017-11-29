import * as Utils from "./Utils";
import * as ArrayUtils from "./ArrayUtils";
import * as Maths from "./Maths";

export function fillRect(
  context2d: CanvasRenderingContext2D,
  position: Maths.Vector2,
  width: number, height: number,
  fillStyle: string
) {
  context2d.fillStyle = fillStyle;
  context2d.fillRect(position.x, position.y, width, height);
}
export function fillCircle(
  context2d: CanvasRenderingContext2D,
  position: Maths.Vector2,
  radius: number,
  fillStyle: string
) {
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

export class ColumnChartAreaMetrics {
  constructor(
    public width: number,
    public height: number,
    public minValue: number,
    public maxValue: number,
    public columnWidth: number,
    public columnHorizontalPadding: number
  ) {}
}
export function valueToY(chartAreaMetrics: ColumnChartAreaMetrics, value: number): number {
  const priceRange = chartAreaMetrics.maxValue - chartAreaMetrics.minValue;
  const yPercentFromBottom = (value - chartAreaMetrics.minValue) / priceRange;
  const yFromBottom = yPercentFromBottom * chartAreaMetrics.height;
  const yFromTop = chartAreaMetrics.height - yFromBottom;
  return yFromTop;
}

export function drawCandlesticks(
  context2d: CanvasRenderingContext2D,
  chartAreaMetrics: ColumnChartAreaMetrics,
  scrollOffsetInColumns: number,
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[]
) {
  const candlestickCount = opens.length;

  for (let i = 0; i < candlestickCount; i++) {
    const iFromRight = (candlestickCount - 1) - i;
    const columnX = Utils.iFromRightToColumnX(
      chartAreaMetrics.width, chartAreaMetrics.columnWidth, scrollOffsetInColumns, iFromRight
    );

    const open = opens[i];
    const high = highs[i];
    const low = lows[i];
    const close = closes[i];

    const a = 1;
    const fillStyle = (close > open) ? `rgba(0, 128, 0, ${a})` : `rgba(255, 0, 0, ${a})`;

    const bodyLeft = columnX + chartAreaMetrics.columnHorizontalPadding;
    const bodyRight = (columnX + chartAreaMetrics.columnWidth) - chartAreaMetrics.columnHorizontalPadding;
    const bodyWidth = bodyRight - bodyLeft;
    const bodyMaxPrice = Math.max(open, close);
    const bodyMinPrice = Math.min(open, close);
    const bodyTop = valueToY(chartAreaMetrics, bodyMaxPrice);
    const bodyBottom = valueToY(chartAreaMetrics, bodyMinPrice);
    const bodyHeight = bodyBottom - bodyTop;

    const wickLeft = columnX + (chartAreaMetrics.columnWidth / 2);
    const wickTop = valueToY(chartAreaMetrics, high);
    const wickBottom = valueToY(chartAreaMetrics, low);
    const wickHeight = wickBottom - wickTop;

    // draw candlestick body
    fillRect(context2d, new Maths.Vector2(bodyLeft, bodyTop), bodyWidth, bodyHeight, fillStyle);
    
    // draw candlestick wick
    fillRect(context2d, new Maths.Vector2(wickLeft, wickTop), 1, wickHeight, fillStyle);
  }
}

export class IchimokuCloud {
  constructor(
    public conversionLinePrices: number[],
    public baseLinePrices: number[],
    public leadingSpanAPrices: number[],
    public leadingSpanBPrices: number[],
    public laggingSpanPrices: number[]
  ) {}
}
export function calcIchimokuCloud(highs: number[], lows: number[], closes: number[]): IchimokuCloud {
  const conversionLinePrices = ArrayUtils.combineArrays(
    Maths.laggingMax(highs, 9),
    Maths.laggingMin(lows, 9),
    (a, b) => (a + b) / 2
  );
  const baseLinePrices = ArrayUtils.combineArrays(
    Maths.laggingMax(highs, 26),
    Maths.laggingMin(lows, 26),
    (a, b) => (a + b) / 2
  );
  const leadingSpanAPrices = ArrayUtils.combineArrays(
    conversionLinePrices,
    baseLinePrices,
    (a, b) => (a + b) / 2
  );
  const leadingSpanBPrices = ArrayUtils.combineArrays(
    Maths.laggingMax(highs, 52),
    Maths.laggingMin(lows, 52),
    (a, b) => (a + b) / 2
  );
  const laggingSpanPrices = closes;

  return new IchimokuCloud(
    conversionLinePrices,
    baseLinePrices,
    leadingSpanAPrices,
    leadingSpanBPrices,
    laggingSpanPrices
  );
}

export function drawIchimokuCloud(
  context2d: CanvasRenderingContext2D,
  chartAreaMetrics: ColumnChartAreaMetrics,
  scrollOffsetInColumns: number,
  cloud: IchimokuCloud
) {
  fillPolylineOnChart(context2d, chartAreaMetrics, scrollOffsetInColumns, cloud.conversionLinePrices, "blue");
  fillPolylineOnChart(context2d, chartAreaMetrics, scrollOffsetInColumns, cloud.baseLinePrices, "purple");
  fillPolylineOnChart(context2d, chartAreaMetrics, scrollOffsetInColumns - 26, cloud.leadingSpanAPrices, "green");
  fillPolylineOnChart(context2d, chartAreaMetrics, scrollOffsetInColumns - 26, cloud.leadingSpanBPrices, "red");
  fillPolylineOnChart(context2d, chartAreaMetrics, scrollOffsetInColumns + 26, cloud.laggingSpanPrices, "rgb(255, 255, 255)");
}

export function fillPolylineOnChart(
  context2d: CanvasRenderingContext2D,
  chartAreaMetrics: ColumnChartAreaMetrics,
  scrollOffsetInColumns: number,
  values: number[],
  strokeStyle: string
) {
  const points = values.map((value, index) => {
    const iFromRight = (values.length - 1) - index;

    const columnX = Utils.iFromRightToColumnX(
      chartAreaMetrics.width,
      chartAreaMetrics.columnWidth,
      scrollOffsetInColumns,
      iFromRight
    );

    return new Maths.Vector2(
      columnX + (chartAreaMetrics.columnWidth / 2),
      valueToY(chartAreaMetrics, value)
    );
  });

  strokePolyline(context2d, points, strokeStyle);  
}