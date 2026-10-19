import { initialCamera, zoomCamera } from './canvas-camera';
import type { Camera, Point } from './canvas-props';

export interface CanvasPointer {
  id: string | number;
  point: Point;
}

interface Pinch {
  centre: Point;
  distance: number;
}

const dragThreshold = 4;

function pinch(points: Map<string | number, Point>): Pinch {
  const [a = { x: 0, y: 0 }, b = a] = points.values();

  return {
    centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.hypot(b.x - a.x, b.y - a.y),
  };
}

function moved(a: Camera, b: Camera): boolean {
  return (
    Math.hypot(a.x - b.x, a.y - b.y) > dragThreshold || a.scale !== b.scale
  );
}

export class CanvasGesture {
  private readonly points = new Map<string | number, Point>();
  private origin: Pinch = { centre: { x: 0, y: 0 }, distance: 0 };
  private start = initialCamera;
  private latest = initialCamera;
  private dragged = false;

  public begin(pointer: CanvasPointer, view: Camera): void {
    if (this.points.size === 0) this.dragged = false;
    this.points.set(pointer.id, pointer.point);
    this.dragged ||= this.points.size > 1;
    this.snapshot(view);
  }

  public move(pointer: CanvasPointer): Camera | undefined {
    if (!this.points.has(pointer.id)) return undefined;
    this.points.set(pointer.id, pointer.point);
    const current = pinch(this.points);
    const view = this.zoom(current);
    this.latest = {
      ...view,
      x: view.x + current.centre.x - this.origin.centre.x,
      y: view.y + current.centre.y - this.origin.centre.y,
    };
    this.dragged ||= moved(this.latest, this.start);

    return this.latest;
  }

  private zoom(current: Pinch): Camera {
    const factor =
      this.origin.distance > 0 ? current.distance / this.origin.distance : 1;

    return zoomCamera(this.start, this.origin.centre, factor);
  }

  public release(id: string | number): boolean {
    if (!this.points.delete(id)) return false;
    const tap = !this.dragged && this.points.size === 0;
    this.snapshot(this.latest);

    return tap;
  }

  public cancel(id: string | number): void {
    this.dragged = true;
    this.points.delete(id);
    this.snapshot(this.latest);
  }

  public cancelAll(): void {
    this.points.clear();
    this.dragged = true;
  }

  private snapshot(view: Camera): void {
    this.start = this.latest = view;
    this.origin = pinch(this.points);
  }
}
