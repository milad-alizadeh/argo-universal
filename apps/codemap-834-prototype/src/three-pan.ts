import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import {
  startSample,
  sampleFrame,
  sampleResult,
  type FrameSample,
} from './frame-sample';
import type { PanResult } from './model';
import type { ThreeContext } from './three-context';

type PanContext = Pick<ThreeContext, 'gl' | 'viewport' | 'invalidate'>;

interface Run extends FrameSample {
  done: (result: PanResult) => void;
  offset: number;
}

const wavePeriod = 1200;

/** Screen pixels; about 18 world units at the fit distance. */
const panDistance = 90;

const metric =
  'R3F submitted render cadence while camera pans; not GPU completion';

function startPan(
  ctx: PanContext,
  run: RefObject<Run | null>,
  duration: number,
): Promise<PanResult> {
  return new Promise((done) => {
    run.current = { ...startSample(duration), done, offset: 0 };
    ctx.invalidate();
  });
}

function moveCamera(ctx: PanContext, run: Run, elapsed: number): void {
  const offset = Math.sin(elapsed / wavePeriod) * panDistance;
  ctx.viewport.pan({ x: offset - run.offset, y: 0 });
  run.offset = offset;
}

function finish(ctx: PanContext, run: Run): void {
  run.done({
    ...sampleResult(run, metric),
    drawCalls: ctx.gl.info.render.calls,
    triangles: ctx.gl.info.render.triangles,
  });
}

function frame(ctx: PanContext, ref: RefObject<Run | null>): void {
  const run = ref.current;

  if (!run) return;
  const elapsed = sampleFrame(run, performance.now());
  moveCamera(ctx, run, elapsed);

  if (elapsed >= run.duration) {
    finish(ctx, run);
    ref.current = null;
  } else ctx.invalidate();
}

function attach(ctx: PanContext, ref: RefObject<Run | null>): () => void {
  window.__mapPan834 = (duration): Promise<PanResult> =>
    startPan(ctx, ref, duration);

  return (): void => {
    delete window.__mapPan834;
  };
}

export function useThreePan(ctx: PanContext): void {
  const run = useRef<Run | null>(null);
  const { gl, viewport, invalidate } = ctx;
  useEffect(
    () => attach({ gl, viewport, invalidate }, run),
    [gl, viewport, invalidate],
  );
  useFrame(() => frame(ctx, run));
}
