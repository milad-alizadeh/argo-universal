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

type CalloutKinds = {
  loading: Record<never, never>;
  authenticate: AuthCalloutProps;
  'auth-required': AuthRequiredCardProps;
  launch: LaunchCalloutProps;
};

type CalloutKind = keyof CalloutKinds;

type KindProps<Kind extends CalloutKind> = { kind: Kind } & CalloutKinds[Kind];

// The one callout above a Session's Composer: sign in, a Turn that needs sign-in, an Agent that failed to launch, or its open running again.
export type SessionCalloutProps = {
  [Kind in CalloutKind]: KindProps<Kind>;
}[CalloutKind];

// Each kind's view takes that kind's props.
type CalloutViews = {
  [Kind in CalloutKind]: (props: KindProps<Kind>) => React.JSX.Element | null;
};

const views: CalloutViews = {
  loading: () => <CalloutLoading />,
  authenticate: (props) => <AuthCallout {...props} />,
  'auth-required': (props) => <AuthRequiredCard {...props} />,
  launch: (props) => <LaunchCallout {...props} />,
};

const viewOf = <Kind extends CalloutKind>(
  props: KindProps<Kind>,
): React.JSX.Element | null => views[props.kind](props);

export function SessionCallout(
  props: SessionCalloutProps,
): React.JSX.Element | null {
  return viewOf(props);
}
