import {
  Canvas,
  Group,
  Picture,
  type SkPicture,
  type Transforms3d,
} from '@shopify/react-native-skia';
import { useEffect, useRef, useState, type JSX, type RefObject } from 'react';
import { useFlatContext, type FlatContext } from './flat-context';
import { useFlatLabels } from './flat-labels';
import { useFlatPan } from './flat-pan';
import { useFlatPicture } from './flat-picture';
import { useFlatPointer } from './flat-pointer';
import { FlatRaster } from './flat-raster';
import { useFlatWheel } from './flat-wheel';
import type { MapProps } from './model';
import { supportsWebGL } from './webgl';

const halves = 2;

function transform(ctx: FlatContext): Transforms3d {
  return [
    { translateX: ctx.size.width / halves + ctx.camera.x },
    { translateY: ctx.size.height / halves + ctx.camera.y },
    { scale: ctx.scale * ctx.camera.zoom },
  ];
}

interface DrawingProps {
  ctx: FlatContext;
  picture: SkPicture;
  gpu: boolean;
}

function Drawing({ ctx, picture, gpu }: DrawingProps): JSX.Element {
  if (!gpu) return <FlatRaster ctx={ctx} picture={picture} />;

  return (
    <Canvas style={{ width: ctx.size.width, height: ctx.size.height }}>
      <Group transform={transform(ctx)}>
        <Picture picture={picture} />
      </Group>
    </Canvas>
  );
}

function useLifecycle(ctx: FlatContext, gpu: boolean): void {
  const { onReady, tiles } = ctx;
  useEffect(() => {
    if (gpu)
      onReady({
        engine: 'Skia / CanvasKit',
        files: tiles.length,
        dpr: window.devicePixelRatio,
      });
  }, [gpu, onReady, tiles.length]);
  useFlatPan(ctx);
  useFlatLabels(ctx);
  useFlatWheel(ctx);
}

function useDrawing(
  props: MapProps,
  host: RefObject<HTMLDivElement | null>,
): DrawingProps {
  const [gpu] = useState(supportsWebGL);
  const ctx = useFlatContext(props, host);
  const picture = useFlatPicture(ctx);
  useFlatPointer(ctx);
  useLifecycle(ctx, gpu);

  return { ctx, picture, gpu };
}

export default function FlatMap(props: MapProps): JSX.Element {
  const host = useRef<HTMLDivElement | null>(null);
  const drawing = useDrawing(props, host);

  return (
    <div
      ref={host}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <Drawing {...drawing} />
    </div>
  );
}
