import { useFrame } from '@react-three/fiber';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react';
import { cullLabels } from './model';
import type { ThreeContext } from './three-context';
import { projectLabels } from './three-labels-project';

interface LabelState {
  dirty: boolean;
  last: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const labelInterval = 100;

function defer(ctx: ThreeContext, state: LabelState, delay: number): void {
  if (state.timer !== null) return;
  state.timer = setTimeout(() => {
    state.timer = null;
    ctx.invalidate();
  }, delay);
}

function frame(ctx: ThreeContext, state: LabelState): void {
  if (!state.dirty) return;
  const now = performance.now();
  const remaining = labelInterval - (now - state.last);

  if (remaining > 0) {
    defer(ctx, state, remaining);

    return;
  }

  state.dirty = false;
  state.last = now;
  const candidates = projectLabels(ctx.tiles, ctx);
  ctx.onLabels(cullLabels(candidates, ctx.size.width, ctx.size.height));
}

function listen(
  ctx: Pick<ThreeContext, 'controls' | 'invalidate'>,
  state: LabelState,
): () => void {
  const changed = (): void => {
    state.dirty = true;
    ctx.invalidate();
  };

  ctx.controls.addEventListener('change', changed);

  return () => {
    ctx.controls.removeEventListener('change', changed);

    if (state.timer !== null) clearTimeout(state.timer);
    state.timer = null;
  };
}

function initialLabels(): LabelState {
  return { dirty: true, last: 0, timer: null };
}

function useOrderedTiles(tiles: ThreeContext['tiles']): ThreeContext['tiles'] {
  return useMemo(() => [...tiles].sort((a, b) => b.area - a.area), [tiles]);
}

function useLabelEvents(ctx: ThreeContext): RefObject<LabelState> {
  const state = useRef<LabelState>(initialLabels());
  const { controls, invalidate, tiles, size } = ctx;
  useEffect(
    () => listen({ controls, invalidate }, state.current),
    [controls, invalidate],
  );
  useLayoutEffect(() => {
    state.current.dirty = true;
    invalidate();
  }, [tiles, size.width, size.height, invalidate]);

  return state;
}

export function useThreeLabels(ctx: ThreeContext): void {
  const state = useLabelEvents(ctx);
  const ordered = useOrderedTiles(ctx.tiles);
  useFrame(() => frame({ ...ctx, tiles: ordered }, state.current));
}
