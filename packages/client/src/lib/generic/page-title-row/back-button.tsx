import type * as React from 'react';
import { IconButton } from '#primitives/actions/icon-button';

export interface BackButtonProps {
  onBack: () => void;
}

// Returns to the page this one was opened from; its chevron follows the page title beside it.
export function BackButton({ onBack }: BackButtonProps): React.JSX.Element {
  return (
    <IconButton
      icon="chevron-left"
      iconRole="title"
      iconClassName="text-foreground"
      size="xs"
      variant="ghost"
      accessibilityLabel="Back"
      onPress={onBack}
      className="web:[app-region:no-drag]"
    />
  );
}
