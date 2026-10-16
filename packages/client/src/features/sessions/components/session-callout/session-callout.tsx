import type * as React from 'react';
import {
  AuthCallout,
  type AuthCalloutProps,
} from '../auth-callout/auth-callout';
import {
  AuthRequiredCard,
  type AuthRequiredCardProps,
} from '../auth-required-card/auth-required-card';
import {
  CalloutLoading,
  LaunchCallout,
  type LaunchCalloutProps,
} from '../launch-callout/launch-callout';

// The one callout above a Session's Composer: sign in, a Turn that needs sign-in, an Agent that failed to launch, or its open running again.
export type SessionCalloutProps =
  | { kind: 'loading' }
  | ({ kind: 'authenticate' } & AuthCalloutProps)
  | ({ kind: 'auth-required' } & AuthRequiredCardProps)
  | ({ kind: 'launch' } & LaunchCalloutProps);

// The sign-in callout, or Loading… until the Agent's methods arrive.
export const signInCallout = (
  auth: AuthCalloutProps | undefined,
): SessionCalloutProps =>
  auth ? { kind: 'authenticate', ...auth } : { kind: 'loading' };

type CalloutView = (props: SessionCalloutProps) => React.JSX.Element | null;

const views: Record<SessionCalloutProps['kind'], CalloutView> = {
  loading: () => <CalloutLoading />,
  authenticate: (props) =>
    props.kind === 'authenticate' ? <AuthCallout {...props} /> : null,
  'auth-required': (props) =>
    props.kind === 'auth-required' ? <AuthRequiredCard {...props} /> : null,
  launch: (props) =>
    props.kind === 'launch' ? <LaunchCallout {...props} /> : null,
};

export function SessionCallout(
  props: SessionCalloutProps,
): React.JSX.Element | null {
  return views[props.kind](props);
}
