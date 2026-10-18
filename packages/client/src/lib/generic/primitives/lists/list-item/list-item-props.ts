import type { ReactNode } from 'react';
import type { ProgressBarProps } from '#primitives/status/progress-bar';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  meta?: ReactNode;
  value?: string;
  badge?: number;
  progress?: ProgressBarProps;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}
