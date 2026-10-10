import type * as React from 'react';
import { Button } from '#lib/generic/primitives/button';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { Icon } from '../../../lib/generic/symbols/icon';

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
    <Button
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="size-14 sm:size-14 rounded-full"
    >
      <Icon size="lg" name={icon} className="text-primary-foreground" />
    </Button>
  );
}
