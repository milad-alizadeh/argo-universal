import type { ReactNode } from 'react';
import { Button } from '#primitives/actions/button';

export interface RequestActionProps {
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  children: string;
  primary?: boolean;
  loading?: boolean;
}

// Wide, a small action in the card's foot; a compact window stacks full-width actions with an edge, from the Button's narrow layout.
export function RequestAction({
  children,
  primary,
  ...props
}: RequestActionProps): ReactNode {
  return (
    <Button
      {...props}
      variant={primary ? 'default' : 'ghost'}
      size="sm"
      fullWidth="narrow"
      label={children}
    />
  );
}
