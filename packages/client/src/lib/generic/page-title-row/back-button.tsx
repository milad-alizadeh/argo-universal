import type * as React from 'react';
import { IconButton } from '../primitives/buttons/icon-button/icon-button';
import { useTextIconSize } from '../symbols/text-icon-size';

export interface BackButtonProps {
  onBack: () => void;
}

// Returns to the page this one was opened from; its chevron follows the page title beside it.
export function BackButton({ onBack }: BackButtonProps): React.JSX.Element {
  return (
    <IconButton
      icon="chevron-left"
      iconSize={useTextIconSize('title')}
      iconClassName="text-foreground"
      size="sm"
      variant="ghost"
      accessibilityLabel="Back"
      onPress={onBack}
      className="web:[app-region:no-drag]"
    />
  );
}
