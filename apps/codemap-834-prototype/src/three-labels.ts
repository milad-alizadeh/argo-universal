import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { placeLabels } from './map-labels';
import type { ThreeContext } from './three-context';
import { roofCentres } from './three-label-anchors';

type LabelContext = Pick<
  ThreeContext,
  'tiles' | 'insets' | 'viewport' | 'onLabels'
>;

/** Places labels in the frame that draws a new pose, so they never trail the buildings. */
function frame(ctx: LabelContext, placedFor: RefObject<string>): void {
  const pose = ctx.viewport.pose();
  const key = JSON.stringify(pose);

  if (key === placedFor.current) return;
  placedFor.current = key;
  const screen = { size: pose.size, insets: ctx.insets };
  ctx.onLabels(placeLabels(ctx.tiles, roofCentres(ctx.tiles, pose), screen));
}

export function useThreeLabels(ctx: ThreeContext): void {
  const placedFor = useRef('');
  const { tiles, insets, invalidate } = ctx;

  useLayoutEffect(() => {
    placedFor.current = '';
    invalidate();
  }, [tiles, insets, invalidate]);

  useFrame(() => frame(ctx, placedFor));
}
