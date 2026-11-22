import {
  Canvas as SkiaCanvas,
  Group,
  Picture,
  type SkPicture,
} from '@shopify/react-native-skia';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { wrapKitDrawing, type KitDrawingHit } from '../../../wrapped-component';
import { CanvasAccessibleList } from './canvas-accessibility';
import { worldPoint } from './canvas-camera';
import { CanvasFrame } from './canvas-frame';
import { positionLabelBounds } from './canvas-label-bounds';
import { CanvasLabels } from './canvas-labels';
import {
  CanvasTooltip,
  SelectionOutline,
  selectionBounds,
} from './canvas-overlay';
import type { Bounds, Camera, CanvasProps } from './canvas-props';
import {
  useCanvasRendering,
  frameProps,
  type Rendering,
} from './canvas-rendering';
import { entryAt, entryKey, type SceneEntry } from './canvas-scene-types';

interface PictureProps {
  picture: SkPicture;
  view: Camera;
}

const canvasSurface = {
  style: { width: '100%', height: '100%', pointerEvents: 'none' },
  accessible: false,
} as const;

const fullFrame = { width: '100%', height: '100%' } as const;

function CanvasPicture({ picture, view }: PictureProps): React.JSX.Element {
  const transform = [
    { translateX: view.x },
    { translateY: view.y },
    { scale: view.scale },
  ];

  return (
    <SkiaCanvas {...canvasSurface}>
      <Group transform={transform}>
        <Picture picture={picture} />
      </Group>
    </SkiaCanvas>
  );
}

export default function CanvasRenderer(props: CanvasProps): React.JSX.Element {
  const context = useCanvasRendering(props);
  const list = listProps(context);

  return (
    <View style={fullFrame}>
      <CanvasSurface context={context} />
      <CanvasAccessibleList {...list} />
    </View>
  );
}

function listProps({
  scene,
  props,
  controls,
  frame,
}: Rendering): ComponentProps<typeof CanvasAccessibleList> {
  return {
    entries: frame.width > 0 ? scene.entries : [],
    label: props.label,
    selected: controls.selected,
    onSelect: controls.onSelect,
  };
}

function CanvasSurface({ context }: { context: Rendering }): React.JSX.Element {
  const frame = frameProps(context);

  return (
    <CanvasFrame {...frame}>
      <CanvasPicture picture={context.scene.picture} view={context.view} />
      <CanvasOverlays context={context} />
    </CanvasFrame>
  );
}

function selectedProps({
  scene,
  controls,
  view,
}: Rendering): ComponentProps<typeof SelectionOutline> {
  const entry = scene.entries.find((node) => entryKey(node, controls.selected));

  return {
    entry,
    view,
    bounds:
      entry &&
      positionLabelBounds(entry, view, controls.labelHits.get(entry.address)),
  };
}

function tooltipProps({
  scene,
  controls,
  view,
  frame,
}: Rendering): ComponentProps<typeof CanvasTooltip> {
  const entry = scene.entries.find((node) => node.address === controls.hover);

  return { entry, view, frame };
}

function CanvasOverlays({
  context,
}: {
  context: Rendering;
}): React.JSX.Element {
  const labels = labelProps(context);

  return (
    <>
      <CanvasLabels {...labels} />
      <CanvasDrawingTargets context={context} />
      <SelectionOutline {...selectedProps(context)} />
      <CanvasTooltip {...tooltipProps(context)} />
    </>
  );
}

// Skia draws into one picture, so a declared shape's wrapper measures its transformed bounds.
function CanvasDrawingTargets({
  context,
}: {
  context: Rendering;
}): React.ReactNode {
  const { scene, view, controls } = context;

  return scene.entries.map((entry) => {
    const { wrap } = entry.drawing;

    if (!wrap) return null;

    const bounds = selectionBounds({
      entry,
      view,
      bounds: positionLabelBounds(
        entry,
        view,
        controls.labelHits.get(entry.address),
      ),
    });

    if (!bounds) return null;

    return (
      <View
        key={entry.address}
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: bounds.x,
          top: bounds.y,
          width: Math.max(1, bounds.width),
          height: Math.max(1, bounds.height),
        }}
      >
        {wrapKitDrawing(
          wrap,
          <View
            pointerEvents="none"
            style={{
              width: Math.max(1, bounds.width),
              height: Math.max(1, bounds.height),
            }}
          />,
          drawingHit(context, entry, bounds),
        )}
      </View>
    );
  });
}

function drawingHit(
  { scene, view }: Rendering,
  entry: SceneEntry,
  bounds: Bounds,
): KitDrawingHit | undefined {
  if (entry.drawing.kind === 'text') return;

  return ({ x, y }) =>
    entryAt(
      scene.entries,
      worldPoint({ x: bounds.x + x, y: bounds.y + y }, view),
    ) === entry;
}

function labelProps(context: Rendering): ComponentProps<typeof CanvasLabels> {
  const { scene, controls, view, frame } = context;

  return {
    entries: scene.entries,
    view,
    frame,
    onBounds: controls.onBounds,
  };
}
