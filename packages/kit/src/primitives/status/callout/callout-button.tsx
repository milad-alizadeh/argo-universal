import type * as React from 'react';
import { useWide } from '#kit/use-wide/use-wide';
import { Button, type ButtonProps } from '#primitives/actions/button';

// A callout's action: small, and full width under the text on a phone.
export type CalloutButtonProps = Omit<ButtonProps, 'size' | 'fullWidth'>;

export function CalloutButton(props: CalloutButtonProps): React.JSX.Element {
  const wide = useWide();

  return <Button {...props} size="sm" fullWidth={!wide} />;
}
