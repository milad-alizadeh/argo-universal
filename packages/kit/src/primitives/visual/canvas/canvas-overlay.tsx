import { View, type ViewStyle } from 'react-native';
import { Text } from '#primitives/content/text';
import { screenPoint } from './canvas-camera';
import type { Bounds, Camera, CanvasDrawing } from './canvas-props';
import type { SceneEntry } from './canvas-scene-types';

interface Props {
  entry?: SceneEntry;
  view: Camera;
  bounds?: Bounds;
}

interface TooltipProps extends Props {
  frame: Bounds;
}

const outlinePadding = 3;

const tooltipOffset = 32;

const outline = {
  pointerEvents: 'none',
  accessible: false,
  className: 'border-foreground border-2',
} as const;

const tooltip = {
  pointerEvents: 'none',
  role: 'tooltip',
  className: 'bg-primary rounded-sm px-2 py-1 shadow-control',
} as const;

function selectionBounds({ entry, view, bounds }: Props): Bounds | undefined {
  if (bounds) return bounds;

  if (!entry) return undefined;
  const point = screenPoint(entry.bounds, view);

  return {
    ...point,
    width: entry.bounds.width * view.scale,
    height: entry.bounds.height * view.scale,
  };
}

function outlineStyle(bounds: Bounds, props: Props): ViewStyle {
  const padding = outlineInset(props.entry);

  return {
    position: 'absolute',
    borderRadius: outlineRadius(props),
    left: bounds.x - padding,
    top: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function SelectionOutline(props: Props): React.JSX.Element | null {
  const bounds = selectionBounds(props);

  return bounds ? (
    <View {...outline} style={outlineStyle(bounds, props)} />
  ) : null;
}

function tooltipStyle(props: TooltipProps): ViewStyle {
  if (!props.entry) return {};
  const point = screenPoint(props.entry.bounds, props.view);

  const left = Math.max(
    0,
    Math.min(point.x, props.frame.width - tooltipOffset),
  );

  return {
    position: 'absolute',
    left,
    top: Math.max(0, point.y - tooltipOffset),
    maxWidth: props.frame.width - left,
  };
}

export function CanvasTooltip(props: TooltipProps): React.JSX.Element | null {
  if (!props.entry?.label) return null;

  return (
    <View {...tooltip} style={tooltipStyle(props)}>
      <Text role="secondary" className="text-primary-foreground">
        {props.entry.label}
      </Text>
    </View>
  );
}

function outlineRadius({ entry, view }: Props): number {
  const radius = entry ? drawingRadius(entry.drawing) : 0;

  return radius > 0 ? radius * view.scale + 2 : 0;
}

function drawingRadius(drawing: CanvasDrawing): number {
  return drawing.kind === 'rect' ? (drawing.props.rx ?? 0) : 0;
}

function outlineInset(entry?: SceneEntry): number {
  return entry ? drawingInset(entry.drawing) : outlinePadding;
}

function drawingInset(drawing: CanvasDrawing): number {
  if (drawing.kind !== 'rect') return outlinePadding;

  return drawing.props.rx ? outlinePadding : 0;
}
