import type {
  RectProps,
  CircleProps,
  LineProps,
  PathProps,
  CanvasTextProps,
  GroupProps,
} from './canvas-props';

// Declarations read by Canvas, never one native view per drawing.
export function CanvasRect(_props: RectProps): null {
  return null;
}

export function CanvasCircle(_props: CircleProps): null {
  return null;
}

export function CanvasLine(_props: LineProps): null {
  return null;
}

export function CanvasPath(_props: PathProps): null {
  return null;
}

export function CanvasText(_props: CanvasTextProps): null {
  return null;
}

export function CanvasGroup(_props: GroupProps): null {
  return null;
}
