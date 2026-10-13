import type { Colour, Point } from './engine';

export type InkStroke = { points: Point[]; colour: Colour; width: number };

export function copyInk(strokes: InkStroke[]): InkStroke[] {
  return strokes.map(stroke => ({ points: stroke.points.map(point => ({ ...point })), colour: [...stroke.colour], width: stroke.width }));
}

export function validInk(strokes: InkStroke[]): boolean {
  return Array.isArray(strokes) && strokes.every(stroke => stroke && Number.isFinite(stroke.width) && stroke.width >= 1 && stroke.width <= 12
    && Array.isArray(stroke.colour) && stroke.colour.length === 3 && stroke.colour.every(value => Number.isFinite(value) && value >= 0 && value <= 1)
    && Array.isArray(stroke.points) && stroke.points.length > 0 && stroke.points.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y)));
}

/** Round, uniform ink strokes. Time and stylus pressure do not add ink. */
export function drawInk(context: CanvasRenderingContext2D, strokes: InkStroke[], width: number, height: number, margin: number, scale: number) {
  context.clearRect(0, 0, width * scale, height * scale);
  context.save();
  context.scale(scale, scale);
  context.beginPath(); context.rect(margin, margin, width - margin * 2, height - margin * 2); context.clip();
  context.lineCap = 'round'; context.lineJoin = 'round';
  for (const stroke of strokes) {
    context.strokeStyle = context.fillStyle = `rgb(${stroke.colour.map(value => Math.round(value * 255)).join(',')})`;
    context.lineWidth = stroke.width;
    context.beginPath();
    const first = stroke.points[0];
    if (stroke.points.length === 1) {
      context.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2); context.fill();
    } else {
      context.moveTo(first.x, first.y);
      for (let i = 1; i < stroke.points.length; i++) context.lineTo(stroke.points[i].x, stroke.points[i].y);
      context.stroke();
    }
  }
  context.restore();
}
