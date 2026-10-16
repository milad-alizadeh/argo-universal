import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import { Vector3 } from 'three';
import {
  startSample,
  sampleFrame,
  sampleResult,
  type FrameSample,
} from './frame-sample';
import type { PanResult } from './model';
import type { ThreeContext } from './three-context';

type PanContext = Pick<
  ThreeContext,
  'camera' | 'gl' | 'controls' | 'invalidate'
>;

interface Run extends FrameSample {
  done: (result: PanResult) => void;
  camera: Vector3;
  target: Vector3;
}

const wavePeriod = 1200;

const panDistance = 18;

const metric =
  'R3F submitted render cadence while camera pans; not GPU completion';

function startPan(
  ctx: PanContext,
  run: RefObject<Run | null>,
  duration: number,
): Promise<PanResult> {
  return new Promise((done) => {
    run.current = {
      ...startSample(duration),
      done,
      camera: ctx.camera.position.clone(),
      target: ctx.controls.target.clone(),
    };
    ctx.invalidate();
  });
}

function moveCamera(ctx: PanContext, run: Run, elapsed: number): void {
  const offset = new Vector3(
    Math.sin(elapsed / wavePeriod) * panDistance,
    0,
    0,
  );

  ctx.camera.position.copy(run.camera).add(offset);
  ctx.controls.target.copy(run.target).add(offset);
  ctx.controls.update();
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
  const { camera, gl, controls, invalidate } = ctx;
  useEffect(
    () => attach({ camera, gl, controls, invalidate }, run),
    [camera, gl, controls, invalidate],
  );
  useFrame(() => frame(ctx, run));
}
