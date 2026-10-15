import type * as React from 'react';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { IconButton } from '#primitives/buttons/icon-button';

export interface FloatingActionButtonProps {
  accessibilityLabel: string;
  icon: IconName;
  onPress: () => void;
}

const floatingAppearance = {
  className: 'size-14 sm:size-14 rounded-full',
  iconRole: 'action',
  iconClassName: 'text-primary-foreground',
  size: 'sm',
  variant: 'filled',
} as const;

// The phone's round primary action above the content.
export function FloatingActionButton({
  accessibilityLabel,
  icon,
  onPress,
}: FloatingActionButtonProps): React.JSX.Element {
  return (
    <IconButton
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      icon={icon}
      {...floatingAppearance}
    />
  );
}
