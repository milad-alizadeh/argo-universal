import { Skia } from '@shopify/react-native-skia';
import type { NativeTheme } from '../../../native-theme';
import { drawingColor } from './canvas-colors';
import { leafEntry, disposeEntries } from './canvas-entry';
import { assignLabelContainers } from './canvas-label-containers';
import { canvasMatrix, type Matrix } from './canvas-matrix';
import { groupMatrix } from './canvas-paths';
import type { Bounds, CanvasDrawing } from './canvas-props';
import {
  unionBounds,
  type CanvasScene,
  type SceneContext,
  type SceneEntry,
} from './canvas-scene-types';

interface Parent {
  matrix: Matrix;
  address: string;
  onPress?: () => void;
}

function entryFor(drawing: CanvasDrawing, parent: Parent): SceneEntry {
  return {
    key: drawing.key,
    address: parent.address + encodeURIComponent(drawing.key),
    drawing,
    matrix: parent.matrix,
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    label: drawing.props.label,
    onPress: drawing.props.onPress ?? parent.onPress,
  };
}

function drawEntry(
  drawing: CanvasDrawing,
  context: SceneContext,
  parent: Parent,
): SceneEntry {
  const entry = entryFor(drawing, parent);
  context.entries.push(entry);

  if (drawing.kind === 'group') return groupEntry(drawing, entry, context);
  entry.color = drawingColor(drawing.props, context.theme);

  return leafEntry(entry, context);
}

function groupEntry(
  drawing: Extract<CanvasDrawing, { kind: 'group' }>,
  entry: SceneEntry,
  context: SceneContext,
): SceneEntry {
  const children = groupChildren(drawing, entry, context);

  entry.bounds = unionBounds(children.map((child) => child.bounds));

  return entry;
}

export function compileScene(
  drawings: CanvasDrawing[],
  theme: NativeTheme,
  bounds: Bounds,
): CanvasScene {
  const recorder = Skia.PictureRecorder();

  const context = recordingContext(recorder, bounds, theme);

  try {
    return recordedScene(drawings, context, recorder);
  } finally {
    recorder.dispose();
    context.paint.dispose();
  }
}

function recordedScene(
  drawings: CanvasDrawing[],
  context: SceneContext,
  recorder: ReturnType<typeof Skia.PictureRecorder>,
): CanvasScene {
  try {
    recordDrawings(drawings, context);
    assignLabelContainers(context.entries);

    const picture = recorder.finishRecordingAsPicture();

    return { entries: context.entries, picture };
  } catch (error) {
    disposeEntries(context.entries);
    throw error;
  }
}

function sceneParent(): Parent {
  const identity = Skia.Matrix();

  try {
    return { matrix: canvasMatrix.parse(identity.get()), address: '' };
  } finally {
    identity.dispose();
  }
}

function groupChildren(
  drawing: Extract<CanvasDrawing, { kind: 'group' }>,
  entry: SceneEntry,
  context: SceneContext,
): SceneEntry[] {
  const matrix = groupMatrix(drawing.props, entry.matrix);

  const parent = {
    matrix,
    address: `${entry.address}/`,
    onPress: entry.onPress,
  };

  return drawing.children.map((child) => drawEntry(child, context, parent));
}

function recordingContext(
  recorder: ReturnType<typeof Skia.PictureRecorder>,
  bounds: Bounds,
  theme: NativeTheme,
): SceneContext {
  const rect = Skia.XYWHRect(bounds.x, bounds.y, bounds.width, bounds.height);
  const canvas = recorder.beginRecording(rect);
  const paint = Skia.Paint();
  paint.setAntiAlias(true);

  return { canvas, paint, theme, entries: [] };
}

function recordDrawings(
  drawings: CanvasDrawing[],
  context: SceneContext,
): void {
  const parent = sceneParent();

  for (const drawing of drawings) drawEntry(drawing, context, parent);
}
