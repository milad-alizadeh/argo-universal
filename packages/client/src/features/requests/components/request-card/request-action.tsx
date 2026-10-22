import { Button } from '@repo/kit/primitives/actions/button';
import { useWide } from '@repo/kit/use-wide/use-wide';
import type { ReactNode } from 'react';

export interface RequestActionProps {
  disabled?: boolean;
  onPress: () => void;
  children: string;
  primary?: boolean;
  loading?: boolean;
}

// Wide, a small action in the card's foot; a compact window stacks full-width actions with an edge, from the Button's narrow layout.
export function RequestAction({
  children,
  primary,
  loading,
  disabled,
  onPress,
}: RequestActionProps): ReactNode {
  const wide = useWide();

  return (
    <Button
      onPress={onPress}
      disabled={disabled || loading}
      variant={primary ? 'primary' : 'text'}
      size="sm"
      fullWidth={!wide}
      label={children}
    />
  );
}
