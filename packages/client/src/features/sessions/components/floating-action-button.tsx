import type * as React from 'react';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { IconButton } from '../../../lib/generic/primitives/icon-button';

export interface FloatingActionButtonProps {
  accessibilityLabel: string;
  icon: IconName;
  onPress: () => void;
}

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
      className="size-14 sm:size-14 rounded-full"
      icon={icon}
      iconSize={'lg'}
      iconClassName={'text-primary-foreground'}
      size="md"
      variant="filled"
    />
  );
}
