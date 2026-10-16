import type * as React from 'react';
import { Button, type ButtonProps } from '#primitives/buttons/button';

// A callout's action: small, and full width under the text on a phone.
export type CalloutButtonProps = Omit<ButtonProps, 'size' | 'fullWidth'>;

export function CalloutButton(props: CalloutButtonProps): React.JSX.Element {
  return <Button {...props} size="sm" fullWidth="narrow" />;
}
