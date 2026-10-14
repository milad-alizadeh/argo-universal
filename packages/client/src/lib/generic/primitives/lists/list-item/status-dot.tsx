import type * as React from 'react';
import { View } from 'react-native';
import { IconSlot, IconSpinner } from '../../../symbols/icon';
import { cn } from '../../../utils';
import type { ListItemProps } from '../../fields/field-props';

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

  if (status.tone === 'pending') return <StatusSpinner />;

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

// Takes the dot's place while the status is still being found, such as an Agent's Checking….
function StatusSpinner(): React.JSX.Element {
  return (
    <IconSlot role="secondary" {...hiddenFromAccessibility}>
      <IconSpinner
        iconRole="secondary"
        colorClassName="accent-muted-foreground"
      />
    </IconSlot>
  );
}
