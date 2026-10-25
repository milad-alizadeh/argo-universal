import type { ReactNode } from 'react';

export interface SkeletonProps {
  // While true, what the children draw is hidden and a rounded placeholder stands where each text line, icon, image or control was.
  loading: boolean;
  // 'pulse' fades the placeholders in and out; 'none' keeps them still.
  animation?: 'pulse' | 'none';
  testID?: string;
  children?: ReactNode;
}

export interface SkeletonIgnoreProps {
  children?: ReactNode;
}
