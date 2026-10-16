import { useEffect, useRef, type RefObject } from 'react';
import type { FlatContext } from './flat-context';
import type { FlatViewport } from './flat-viewport';
import {
  sampleFrame,
  sampleResult,
  startSample,
  type FrameSample,
} from './frame-sample';
import type { PanResult } from './model';

interface Context {
  viewport: FlatViewport;
  frameId: RefObject<number>;
}

interface Run extends FrameSample {
  offset: number;
  done: (result: PanResult) => void;
}

const wavePeriod = 1200;

const panDistance = 140;

const metric =
  'requestAnimationFrame cadence while Skia picture transform pans; not GPU completion';

function advance(ctx: Context, run: Run, now: number): void {
  const elapsed = sampleFrame(run, now);
  const offset = Math.sin(elapsed / wavePeriod) * panDistance;
  ctx.viewport.pan({ x: offset - run.offset, y: 0 });
  run.offset = offset;

  if (elapsed < run.duration)
    ctx.frameId.current = requestAnimationFrame((next) =>
      advance(ctx, run, next),
    );
  else run.done(sampleResult(run, metric));
}

function start(ctx: Context, duration: number): Promise<PanResult> {
  return new Promise((done) => {
    const run = { ...startSample(duration), offset: 0, done };
    ctx.frameId.current = requestAnimationFrame((now) =>
      advance(ctx, run, now),
    );
  });
}

function attach(ctx: Context): () => void {
  window.__mapPan834 = (duration): Promise<PanResult> => start(ctx, duration);

  return (): void => {
    cancelAnimationFrame(ctx.frameId.current);
    delete window.__mapPan834;
  };
}

export function useFlatPan({ viewport }: FlatContext): void {
  const frameId = useRef(0);
  useEffect(() => attach({ viewport, frameId }), [viewport]);
}
