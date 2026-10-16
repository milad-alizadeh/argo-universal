import {
  Canvas,
  Group,
  Picture,
  type SkPicture,
  type Transforms3d,
} from '@shopify/react-native-skia';
import { useEffect, useRef, type JSX } from 'react';
import { useFlatContext, type FlatContext } from './flat-context';
import { useFlatLabels } from './flat-labels';
import { useFlatPan } from './flat-pan';
import { useFlatPicture } from './flat-picture';
import { useFlatPointer } from './flat-pointer';
import { useFlatWheel } from './flat-wheel';
import type { MapProps } from './model';

const halves = 2;

function transform(ctx: FlatContext): Transforms3d {
  return [
    { translateX: ctx.size.width / halves + ctx.camera.x },
    { translateY: ctx.size.height / halves + ctx.camera.y },
    { scale: ctx.scale * ctx.camera.zoom },
  ];
}

function Drawing({
  ctx,
  picture,
}: {
  ctx: FlatContext;
  picture: SkPicture;
}): JSX.Element {
  return (
    <Canvas style={{ width: ctx.size.width, height: ctx.size.height }}>
      <Group transform={transform(ctx)}>
        <Picture picture={picture} />
      </Group>
    </Canvas>
  );
}

function useLifecycle(ctx: FlatContext): void {
  const { onReady, tiles } = ctx;
  useEffect(
    () =>
      onReady({
        engine: 'Skia / CanvasKit',
        files: tiles.length,
        dpr: window.devicePixelRatio,
      }),
    [onReady, tiles.length],
  );
  useFlatPan(ctx);
  useFlatLabels(ctx);
  useFlatWheel(ctx);
}

export default function FlatMap(props: MapProps): JSX.Element {
  const host = useRef<HTMLDivElement | null>(null);
  const ctx = useFlatContext(props, host);
  const picture = useFlatPicture(ctx);
  useFlatPointer(ctx);
  useLifecycle(ctx);

  return (
    <div
      ref={host}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    >
      <Drawing ctx={ctx} picture={picture} />
    </div>
  );
}
