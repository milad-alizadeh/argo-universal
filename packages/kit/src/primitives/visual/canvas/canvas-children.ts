import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { isKitElement } from '../../../typed-children';
import { kitDrawingWrapper } from '../../../wrapped-component';
import type {
  CanvasDrawing,
  DrawingData,
  RectProps,
  CircleProps,
  LineProps,
  PathProps,
  CanvasTextProps,
  GroupProps,
} from './canvas-props';
import {
  CanvasRect,
  CanvasCircle,
  CanvasLine,
  CanvasPath,
  CanvasText,
  CanvasGroup,
} from './canvas-shapes';

const rect = (child: ReactNode): DrawingData | undefined =>
  isKitElement<RectProps>(child, CanvasRect)
    ? { kind: 'rect', props: child.props }
    : undefined;

const circle = (child: ReactNode): DrawingData | undefined =>
  isKitElement<CircleProps>(child, CanvasCircle)
    ? { kind: 'circle', props: child.props }
    : undefined;

const line = (child: ReactNode): DrawingData | undefined =>
  isKitElement<LineProps>(child, CanvasLine)
    ? { kind: 'line', props: child.props }
    : undefined;

const path = (child: ReactNode): DrawingData | undefined =>
  isKitElement<PathProps>(child, CanvasPath)
    ? { kind: 'path', props: child.props }
    : undefined;

const text = (child: ReactNode): DrawingData | undefined =>
  isKitElement<CanvasTextProps>(child, CanvasText)
    ? { kind: 'text', props: child.props }
    : undefined;

const group = (child: ReactNode): DrawingData | undefined =>
  isKitElement<GroupProps>(child, CanvasGroup)
    ? {
        kind: 'group',
        props: child.props,
        children: canvasChildren(child.props.children),
      }
    : undefined;

const readers = [rect, circle, line, path, text, group];

function drawingData(child: ReactNode): DrawingData | undefined {
  for (const read of readers) {
    const result = read(child);

    if (result) return result;
  }

  return undefined;
}

function declarations(child: ReactNode): CanvasDrawing[] {
  if (!isValidElement<{ children?: ReactNode }>(child)) return [];

  if (child.type === Fragment) return canvasChildren(child.props.children);

  return [keyedDrawing(child)];
}

export function canvasChildren(children: ReactNode): CanvasDrawing[] {
  const result: CanvasDrawing[] = [];
  Children.forEach(children, (child) => result.push(...declarations(child)));

  return result;
}

function keyedDrawing(child: React.ReactElement): CanvasDrawing {
  if (child.key === null)
    throw new Error('Canvas needs keyed drawing children');
  const data = drawingData(child);

  if (!data) throw new Error('Canvas only accepts drawing children');

  return { ...data, key: String(child.key), wrap: kitDrawingWrapper(child) };
}
