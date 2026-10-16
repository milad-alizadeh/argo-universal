import { useEffect, useRef, type RefObject } from 'react';
import type { FlatCamera, FlatContext, SetCamera } from './flat-context';
import {
  sampleFrame,
  sampleResult,
  startSample,
  type FrameSample,
} from './frame-sample';
import type { PanResult } from './model';

interface Context {
  camera: RefObject<FlatCamera>;
  frameId: RefObject<number>;
  setCamera: SetCamera;
}

interface Run extends FrameSample {
  initial: FlatCamera;
  done: (result: PanResult) => void;
}

const wavePeriod = 1200;

const panDistance = 140;

const metric =
  'requestAnimationFrame cadence while Skia picture transform pans; not GPU completion';

function advance(ctx: Context, run: Run, now: number): void {
  const elapsed = sampleFrame(run, now);
  ctx.setCamera({
    ...run.initial,
    x: run.initial.x + Math.sin(elapsed / wavePeriod) * panDistance,
  });

  if (elapsed < run.duration)
    ctx.frameId.current = requestAnimationFrame((next) =>
      advance(ctx, run, next),
    );
  else run.done(sampleResult(run, metric));
}

function start(ctx: Context, duration: number): Promise<PanResult> {
  return new Promise((done) => {
    const run = { ...startSample(duration), initial: ctx.camera.current, done };
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

export function useFlatPan({ camera, setCamera }: FlatContext): void {
  const current = useRef(camera);
  const frameId = useRef(0);
  useEffect(() => {
    current.current = camera;
  }, [camera]);
  useEffect(() => attach({ camera: current, frameId, setCamera }), [setCamera]);
}
