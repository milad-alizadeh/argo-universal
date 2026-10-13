import type { ReactNode } from 'react';
import { useContentWide } from '#lib/product/content-layout';
import { Button, type ButtonProps } from '#primitives/buttons/button/button';

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
  const wide = useContentWide();
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
