import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '../../../utils';
import type { ListItemProps } from './list-item-props';

const tones = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
} as const;

export const hiddenFromAccessibility = {
  collapsable: false,
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

export function StatusDot({
  status,
}: Pick<ListItemProps, 'status'>): React.JSX.Element | null {
  if (!status) return null;

  return (
    <View
      {...hiddenFromAccessibility}
      className={cn(
        'size-2 shrink-0 rounded-full wide:size-1.5',
        tones[status.tone],
      )}
    />
  );
}
