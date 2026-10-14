import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '#primitives/buttons/button';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';

export interface RequestActionProps {
  className?: string;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  children: string;
  primary?: boolean;
  loading?: boolean;
}

export function RequestAction({
  children,
  primary,
  ...props
}: RequestActionProps): ReactNode {
  // The window breakpoint, not the column, decides: actions stack only on a phone-wide window.
  const wide = useWide();

  return (
    <Button
      {...props}
      {...requestLayout(primary, wide)}
      appearance="content"
      label={children}
    />
  );
}

function requestLayout(
  primary: boolean | undefined,
  wide: boolean,
): Pick<ButtonProps, 'variant' | 'size' | 'fullWidth'> {
  return {
    variant: requestVariant(primary, wide),
    size: wide ? 'sm' : 'md',
    fullWidth: !wide,
  };
}

function requestVariant(
  primary: boolean | undefined,
  wide: boolean,
): 'default' | 'ghost' | 'outline' {
  if (primary) return 'default';

  return wide ? 'ghost' : 'outline';
}
