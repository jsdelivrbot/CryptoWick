import * as React from "react";
import * as Utils from "./Utils";
import * as ArrayUtils from "./ArrayUtils";
import * as Maths from "./Maths";
import * as Graphics from "./Graphics";
import { TradeAnalysis } from "./TradeAnalysis";

const MARKER_VERTICAL_MARGIN = 5;

export enum CandlestickMarkerType {
  SQUARE,
  CIRCLE,
  TRIANGLE_UP,
  TRIANGLE_DOWN,
  LETTER
}
export enum CandlestickMarkerPosition {
  ABOVE,
  BELOW
}
export class CandlestickMarker {
  constructor(
    public type: CandlestickMarkerType,
    public position: CandlestickMarkerPosition,
    public fillStyle: string,
    public letter?: string
  ) {}
}

export interface CandlestickChartProps {
  tradeAnalysis: TradeAnalysis | null;
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
  markers?: CandlestickMarker[][];
  lines?: number[][];
  width: number;
  height: number;
  columnWidth: number;
  columnHorizontalPadding: number;
  scrollOffsetInColumns: number;
  highlightedColumnIndex?: number;
}
export class CandlestickChart extends React.Component<CandlestickChartProps, {}> {
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
  drawLinearRegressionLine(windowSize: number) {
    if (this.context2d === null) { return; }
    if (this.props.closes.length < windowSize) { return; }

    const chartAreaMetrics = new Graphics.ColumnChartAreaMetrics(
      this.props.width,
      this.props.height,
      this.minPrice,
      this.maxPrice,
      this.props.columnWidth,
      this.props.columnHorizontalPadding
    );

    const linRegPoints = ArrayUtils.generateArray(windowSize, iFromStart => {
      const i = (this.props.closes.length - windowSize) + iFromStart;
      return new Maths.Vector2(iFromStart, this.props.closes[i]);
    });
    const lineOfBestFit = Maths.linearLeastSquares(linRegPoints);

    const lineStartClose = this.props.closes[this.props.closes.length - windowSize];
    const lineStartPoint = new Maths.Vector2(
      Utils.iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, windowSize - 1) + (this.props.columnWidth / 2),
      Graphics.valueToY(chartAreaMetrics, lineOfBestFit.b)
    );
    const lineEndPoint = new Maths.Vector2(
      Utils.iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, 0) + (this.props.columnWidth / 2),
      Graphics.valueToY(chartAreaMetrics, (lineOfBestFit.m * (windowSize - 1)) + lineOfBestFit.b)
    );
    Graphics.strokeLine(this.context2d, lineStartPoint, lineEndPoint, "rgba(255, 255, 255, 0.3)");
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

    Graphics.fillRect(this.context2d, new Maths.Vector2(0, 0), this.props.width, this.props.height, "rgb(64, 64, 64)");

    if (this.props.tradeAnalysis) {
      // draw highlighted column
      if (this.props.highlightedColumnIndex !== undefined) {
        const x = Utils.iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, this.iToIFromRight(this.props.highlightedColumnIndex));
        const position = new Maths.Vector2(x, 0);
        const fillStyle = Utils.COLUMN_HIGHLIGHT_FILL_STYLE;
        Graphics.fillRect(this.context2d, position, this.props.columnWidth, this.props.height, fillStyle);
      }

      const chartAreaMetrics = new Graphics.ColumnChartAreaMetrics(
        this.props.width,
        this.props.height,
        this.minPrice,
        this.maxPrice,
        this.props.columnWidth,
        this.props.columnHorizontalPadding
      );

      // draw candlesticks
      Graphics.drawCandlesticks(
        this.context2d,
        chartAreaMetrics,
        this.props.scrollOffsetInColumns,
        this.props.tradeAnalysis.opens,
        this.props.tradeAnalysis.highs,
        this.props.tradeAnalysis.lows,
        this.props.tradeAnalysis.closes
      );

      // markers
      if(this.props.markers) {
        for (let iFromRight = 0; iFromRight < this.props.tradeAnalysis.candlestickCount; iFromRight++) {
          const i = this.iFromRightToI(iFromRight);
          const columnX = Utils.iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, iFromRight);
  
          const markerWidth = this.props.columnWidth - (2 * this.props.columnHorizontalPadding);
          const markerHeight = markerWidth;
  
          const high = this.props.highs[i];
          const wickTop = Graphics.valueToY(chartAreaMetrics, high);
  
          // Draw markers below.
          const low = this.props.lows[i];
          const wickBottom = Graphics.valueToY(chartAreaMetrics, low);

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

      // lines
      if(this.props.lines) {
        this.props.lines.forEach(prices => {
          if(!this.context2d) return;

          Graphics.fillPolylineOnChart(
            this.context2d, chartAreaMetrics, this.props.scrollOffsetInColumns, prices, "rgb(0, 0, 0)"
          );
        });
      }

      // ichimoku cloud
      const ichimokuCloud = Graphics.calcIchimokuCloud(
        this.props.tradeAnalysis.highs, this.props.tradeAnalysis.lows, this.props.tradeAnalysis.closes
      );

      Graphics.drawIchimokuCloud(
        this.context2d,
        chartAreaMetrics,
        this.props.scrollOffsetInColumns,
        ichimokuCloud
      );

      // draw linear regression lines
      const linRegWindowSizes = [5, 10, 15, 20, 25, 30, 50];
      linRegWindowSizes.forEach(x => this.drawLinearRegressionLine(x));

      // draw chart title
      const chartTitle = `${this.props.tradeAnalysis.securitySymbol} ${this.props.tradeAnalysis.exchangeName} ${this.props.tradeAnalysis.timeframe}`;
      Graphics.fillText(this.context2d, chartTitle, new Maths.Vector2(10, 10), "rgb(255, 255, 255)");
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