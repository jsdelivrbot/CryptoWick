import * as React from "react";
import * as Utils from "./Utils";
import * as Maths from "./Maths";
import * as Graphics from "./Graphics";

export interface LineChartProps {
  chartTitle: string;
  values: number[];
  width: number;
  height: number;
  columnWidth: number;
  columnHorizontalPadding: number;
  scrollOffsetInColumns: number;
  highlightedColumnIndex?: number;
}
export class LineChart extends React.Component<LineChartProps, {}> {
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
    const minValue = Math.min(...this.props.values);
    const maxValue = Math.max(...this.props.values);

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
      const columnX = Utils.iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, iFromRight);
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
      const x = Utils.iFromRightToColumnX(this.props.width, this.props.columnWidth, this.props.scrollOffsetInColumns, this.iToIFromRight(this.props.highlightedColumnIndex));
      const position = new Maths.Vector2(x, 0);
      const fillStyle = Utils.COLUMN_HIGHLIGHT_FILL_STYLE;
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