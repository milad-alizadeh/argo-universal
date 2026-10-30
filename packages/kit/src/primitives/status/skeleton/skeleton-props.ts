import type { ReactNode } from 'react';

export interface SkeletonProps {
  // While true, what the children draw is hidden and a rounded placeholder stands where each text line, icon, image or control was.
  loading: boolean;
  // 'pulse' fades the placeholders in and out; 'none' keeps them still.
  animation?: 'pulse' | 'none';
  // What assistive technology says the busy status is waiting for, such as "Loading Sessions".
  accessibilityLabel?: string;
  // The Skeleton takes all the room its parent has, for content that fills its parent (a FieldGroup or a List); otherwise it is as big as its children, as a row's sibling needs.
  fill?: boolean;
  testID?: string;
  children?: ReactNode;
}

export interface SkeletonIgnoreProps {
  children?: ReactNode;
}
