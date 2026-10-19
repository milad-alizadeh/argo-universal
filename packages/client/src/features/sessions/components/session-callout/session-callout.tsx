import type * as React from 'react';
import type {
  CalloutKind,
  KindProps,
  SessionCalloutProps,
} from '../../types/session-callout';
import { AuthCallout } from '../auth-callout/auth-callout';
import { AuthRequiredCard } from '../auth-required-card/auth-required-card';
import {
  CalloutLoading,
  LaunchCallout,
} from '../launch-callout/launch-callout';

// Each kind's view takes that kind's props.
type CalloutViews = {
  [Kind in CalloutKind]: (props: KindProps<Kind>) => React.JSX.Element | null;
};

const views: CalloutViews = {
  loading: (props) => <CalloutLoading {...props} />,
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
