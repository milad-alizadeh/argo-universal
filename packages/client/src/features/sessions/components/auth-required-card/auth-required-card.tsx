import { authRequiredMessage } from '@repo/contracts';
import type * as React from 'react';
import { Callout, CalloutButton } from '#primitives/display/callout';
import type { AuthRequiredCardProps } from '../../types/session-callout';

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
