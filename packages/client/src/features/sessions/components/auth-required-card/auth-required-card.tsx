import { authRequiredMessage } from '@repo/contracts';
import type * as React from 'react';
import { Callout, CalloutButton } from '#primitives/display/callout';

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
      description={props.description ?? authRequiredMessage}
      actions={
        <CalloutButton label="Authenticate" onPress={props.onAuthenticate} />
      }
    />
  );
}
