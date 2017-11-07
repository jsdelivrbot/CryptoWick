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