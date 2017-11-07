import * as React from "react";
import * as Utils from "./Utils";
import * as Maths from "./Maths";
import * as Graphics from "./Graphics";

export interface HistogramChartProps {
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
export class HistogramChart extends React.Component<HistogramChartProps, {}> {
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
        
        const x = Utils.iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, this.iToIFromRight(this.props.highlightedColumnIndex));
        const position = new Maths.Vector2(x, 0);
        const fillStyle = Utils.COLUMN_HIGHLIGHT_FILL_STYLE;
        Graphics.fillRect(this.context2d, position, this.props.columnWidth, this.props.height, fillStyle);
      }

      // draw bars
      for (let iFromRight = 0; iFromRight < this.props.values.length; iFromRight++) {
        const i = this.iFromRightToI(iFromRight);
        const columnX = Utils.iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, iFromRight);

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