import type * as React from 'react';
import { Button } from '#primitives/buttons/button';
import { Callout } from '#primitives/display/callout';

export interface AuthRequiredCardProps {
  // The Agent's own words when its Turn ended with `auth_required`.
  description?: string;
  onAuthenticate: () => void;
}

// A Turn ended with `auth_required`. Authenticate swaps the card for the sign-in callout; the prompt is not put back.
export function AuthRequiredCard(
  props: AuthRequiredCardProps,
): React.JSX.Element {
  return (
    <Callout
      tone="danger"
      title="Authentication Required"
      description={props.description ?? 'Authentication required'}
      actions={<AuthenticateButton {...props} />}
    />
  );
}

function AuthenticateButton({
  onAuthenticate,
}: Pick<AuthRequiredCardProps, 'onAuthenticate'>): React.JSX.Element {
  return (
    <Button
      size="sm"
      fullWidth="narrow"
      label="Authenticate"
      onPress={onAuthenticate}
    />
  );
}
