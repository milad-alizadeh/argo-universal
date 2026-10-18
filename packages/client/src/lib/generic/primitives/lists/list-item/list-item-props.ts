import type { ReactNode } from 'react';
import type { ProgressBarProps } from '#primitives/status/progress-bar';
import type { Tone } from '#primitives/content/text';

export type RowBadge =
  | { kind: 'status'; tone: Tone; pulse?: boolean; label?: string }
  | { kind: 'count'; count: number; label?: string };

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  meta?: ReactNode;
  value?: string;
  badge?: number | RowBadge;
  progress?: ProgressBarProps;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}
