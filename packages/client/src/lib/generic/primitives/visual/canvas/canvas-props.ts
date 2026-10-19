import type { KitProps } from '../../kit-props';

export type CanvasProps = KitProps<'Canvas'>;

export type RectProps = KitProps<'Canvas.Rect'>;

export type CircleProps = KitProps<'Canvas.Circle'>;

export type LineProps = KitProps<'Canvas.Line'>;

export type PathProps = KitProps<'Canvas.Path'>;

export type CanvasTextProps = KitProps<'Canvas.Text'>;

export type GroupProps = KitProps<'Canvas.Group'>;

export type DrawingData =
  | { kind: 'rect'; props: RectProps }
  | { kind: 'circle'; props: CircleProps }
  | { kind: 'line'; props: LineProps }
  | { kind: 'path'; props: PathProps }
  | { kind: 'text'; props: CanvasTextProps }
  | { kind: 'group'; props: GroupProps; children: CanvasDrawing[] };

export type CanvasDrawing = DrawingData & { key: string };

export interface Point {
  x: number;
  y: number;
}

export interface Bounds extends Point {
  width: number;
  height: number;
}

export interface Camera extends Point {
  scale: number;
}

export interface CanvasFrameProps {
  label: string;
  camera: CanvasProps['camera'];
  view: Camera;
  onCamera: (camera: Camera) => void;
  onSize: (bounds: Bounds) => void;
  onPress: (point: Point) => void;
  onHover: (point?: Point) => void;
  children: React.ReactNode;
}
