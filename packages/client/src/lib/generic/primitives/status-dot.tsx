import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '../utils';
import type { ListItemProps } from './field-props';

const tones = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
} as const;

export function StatusDot({
  status,
}: Pick<ListItemProps, 'status'>): React.JSX.Element | null {
  if (!status) return null;
  return (
    <View
      collapsable={false}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn(
        'size-2 shrink-0 rounded-full wide:size-1.5',
        tones[status.tone],
      )}
    />
  );
}
