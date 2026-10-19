import {
  Canvas as SkiaCanvas,
  Group,
  Picture,
  type SkPicture,
} from '@shopify/react-native-skia';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { CanvasAccessibleList } from './canvas-accessibility';
import { CanvasFrame } from './canvas-frame';
import { positionLabelBounds } from './canvas-label-bounds';
import { CanvasLabels } from './canvas-labels';
import { CanvasTooltip, SelectionOutline } from './canvas-overlay';
import type { CanvasProps, Camera } from './canvas-props';
import {
  useCanvasRendering,
  frameProps,
  type Rendering,
} from './canvas-rendering';
import { entryKey } from './canvas-scene-types';

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
      <SelectionOutline {...selectedProps(context)} />
      <CanvasTooltip {...tooltipProps(context)} />
    </>
  );
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
