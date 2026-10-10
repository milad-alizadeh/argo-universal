import type * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import { createContext, type ComponentProps } from 'react';
import { Easing } from 'react-native-reanimated';

export interface CollapsibleLayoutSync {
  syncLayout: () => void;
  onMotionChange: (moving: boolean) => void;
  grow: (height: number) => void;
}
export type ContentProps = Omit<
  ComponentProps<typeof CollapsiblePrimitive.Content>,
  'asChild'
>;
export const OpenContext = createContext(false);
export const CollapsibleLayoutSyncContext =
  createContext<CollapsibleLayoutSync | null>(null);
export const duration = 200;
const durationPerPoint = 0.6;
const longestDuration = 400;
export function durationFor(height: number): number {
  return Math.min(
    longestDuration,
    Math.max(duration, height * durationPerPoint),
  );
}
export const easeInOut = Easing.inOut(Easing.quad);
export const movingContentStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
} as const;
export function contentAccessibility(open: boolean): {
  pointerEvents: 'auto' | 'none';
  'aria-hidden': boolean;
  accessibilityElementsHidden: boolean;
  importantForAccessibility: 'auto' | 'no-hide-descendants';
} {
  return {
    pointerEvents: open ? 'auto' : 'none',
    'aria-hidden': !open,
    accessibilityElementsHidden: !open,
    importantForAccessibility: open ? 'auto' : 'no-hide-descendants',
  };
}
