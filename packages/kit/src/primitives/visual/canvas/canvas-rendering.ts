import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useNativeTheme, type NativeTheme } from '../../../native-theme';
import {
  fitCamera,
  sceneCamera,
  worldPoint,
  initialCamera,
} from './canvas-camera';
import { canvasChildren } from './canvas-children';
import { positionLabelBounds } from './canvas-label-bounds';
import type {
  Bounds,
  Camera,
  CanvasFrameProps,
  CanvasProps,
  CanvasDrawing,
  Point,
} from './canvas-props';
import { compileScene } from './canvas-scene';
import {
  entryAt,
  inBounds,
  type CanvasScene,
  type SceneEntry,
} from './canvas-scene-types';
import { useCanvasControls, type CanvasControls } from './canvas-state';

export interface Rendering {
  props: CanvasProps;
  scene: CanvasScene;
  frame: Bounds;
  onSize: (frame: Bounds) => void;
  controls: CanvasControls;
  view: Camera;
}

const emptyFrame: Bounds = { x: 0, y: 0, width: 0, height: 0 };

function useCompiled(
  drawings: CanvasDrawing[],
  bounds: Bounds,
  theme: NativeTheme,
): CanvasScene {
  const { colors, toneShades, colorScheme } = theme;

  return useMemo(
    () => compileScene(drawings, { colors, toneShades, colorScheme }, bounds),
    [drawings, colors, toneShades, colorScheme, bounds],
  );
}

function useScene(props: CanvasProps): CanvasScene {
  const theme = useNativeTheme({ toneShades: true });

  const drawings = useMemo(
    () => canvasChildren(props.children),
    [props.children],
  );

  const { width, height } = props;

  const bounds = useMemo(
    () => ({ x: 0, y: 0, width, height }),
    [width, height],
  );

  return useCompiled(drawings, bounds, theme);
}

function useFrame(): [Bounds, (frame: Bounds) => void] {
  const [frame, setFrame] = useState(emptyFrame);

  const size = useCallback(
    (next: Bounds) =>
      setFrame((previous) =>
        previous.width === next.width && previous.height === next.height
          ? previous
          : next,
      ),
    [],
  );

  return [frame, size];
}

export function useCanvasRendering(props: CanvasProps): Rendering {
  const scene = useScene(props);
  const [frame, onSize] = useFrame();
  const controls = useCanvasControls(props);
  const bounds = { x: 0, y: 0, width: props.width, height: props.height };
  const camera = props.camera === 'fixed' ? initialCamera : controls.camera;
  const view = sceneCamera(fitCamera(bounds, frame), camera);

  return { props, scene, frame, onSize, controls, view };
}

function textAt(context: Rendering, point: Point): SceneEntry | undefined {
  return context.scene.entries.findLast((entry) => {
    const measured = context.controls.labelHits.get(entry.address);
    const bounds = positionLabelBounds(entry, context.view, measured);

    return bounds && inBounds(point, bounds);
  });
}

function picked(context: Rendering, point: Point): SceneEntry | undefined {
  return (
    textAt(context, point) ??
    entryAt(context.scene.entries, worldPoint(point, context.view))
  );
}

function press(context: Rendering, point: Point): void {
  const entry = picked(context, point);

  if (entry) context.controls.onSelect(entry);
}

function hoveredKey(context: Rendering, point?: Point): string | undefined {
  return point ? picked(context, point)?.address : undefined;
}

function hover(context: Rendering, point?: Point): void {
  if (Platform.OS === 'web')
    context.controls.setHover(hoveredKey(context, point));
}

export function frameProps(
  context: Rendering,
): Omit<CanvasFrameProps, 'children'> {
  return {
    label: context.props.label,
    camera: context.props.camera,
    view: context.controls.camera,
    onCamera: context.controls.onCamera,
    onSize: context.onSize,
    onPress: (point) => press(context, point),
    onHover: (point) => hover(context, point),
  };
}
