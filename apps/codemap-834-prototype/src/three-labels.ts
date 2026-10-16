import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { placeLabels } from './map-labels';
import type { ThreeContext } from './three-context';
import { roofCentres } from './three-label-anchors';

type LabelContext = Pick<
  ThreeContext,
  'tiles' | 'overlay' | 'viewport' | 'invalidate'
>;

interface Placing {
  placedFor: string;
  last: number;
  timer?: ReturnType<typeof setTimeout>;
}

/** Labels follow the camera at most ten times a second; the occlusion pass is too costly per frame. */
const labelInterval = 100;

/** Whether labels may be placed now; otherwise asks for a frame once the interval has passed. */
function due(ctx: LabelContext, state: Placing, now: number): boolean {
  const remaining = labelInterval - (now - state.last);

  if (remaining <= 0) return true;

  state.timer ??= setTimeout(() => {
    state.timer = undefined;
    ctx.invalidate();
  }, remaining);

  return false;
}

/** Places labels for a new pose; a pose that changed too soon is placed in a later frame. */
function frame(ctx: LabelContext, state: Placing): void {
  const pose = ctx.viewport.pose();
  const key = JSON.stringify(pose);
  const now = performance.now();

  if (key === state.placedFor || !due(ctx, state, now)) return;
  state.placedFor = key;
  state.last = now;
  const screen = { size: pose.size, insets: ctx.overlay.insets.current() };
  ctx.overlay.showLabels(
    placeLabels(ctx.tiles, roofCentres(ctx.tiles, pose), screen),
  );
}

/** Stops a pending placement when the view unmounts. */
function useCancel(state: RefObject<Placing>): void {
  useEffect(() => {
    const placing = state.current;

    return (): void => clearTimeout(placing.timer);
  }, [state]);
}

/** New tiles or new bands place the labels again in the next frame. */
function usePlacing(ctx: ThreeContext): RefObject<Placing> {
  const state = useRef<Placing>({ placedFor: '', last: 0 });
  const { tiles, overlay, invalidate } = ctx;

  useLayoutEffect(() => {
    const replace = (): void => {
      state.current.placedFor = '';
      invalidate();
    };

    replace();

    return overlay.insets.subscribe(replace);
  }, [tiles, overlay, invalidate]);

  useCancel(state);

  return state;
}

export function useThreeLabels(ctx: ThreeContext): void {
  const state = usePlacing(ctx);

  useFrame(() => frame(ctx, state.current));
}
