import { Button } from '@repo/kit/primitives/actions/button';
import type { ReactNode } from 'react';

export interface RequestActionProps {
  disabled?: boolean;
  onPress: () => void;
  children: string;
  primary?: boolean;
  loading?: boolean;
}

// Wide, a small action in the card's foot; a compact window stacks full-width actions with an edge, from the Button's narrow layout.
export function RequestAction(props: RequestActionProps): ReactNode {
  return (
    <Button
      onPress={props.onPress}
      disabled={props.disabled || props.loading}
      variant={props.primary ? 'primary' : 'text'}
      size="sm"
      fullWidth="narrow"
      label={props.children}
    />
  );
}
