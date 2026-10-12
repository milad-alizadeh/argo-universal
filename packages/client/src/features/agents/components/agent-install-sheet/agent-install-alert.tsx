import type * as React from 'react';
import { Alert } from '../../../../lib/generic/primitives/overlays/alert/alert';
import type { AgentInstallPresentation } from '../../state/agent-install-types';
const unsupported = (failure: string): boolean =>
  failure.includes('No distribution') || failure.includes('unsupported');
const alertTitle = (failure: string): string => {
  if (unsupported(failure)) return 'Not supported on this Server';
  if (failure.includes('in use')) return 'Agent is in use';
  return 'Installation failed';
};
const canRetry = (failure: string): boolean =>
  !unsupported(failure) && !failure.includes('in use');
const alertActions = (
  props: AgentInstallPresentation,
  failure: string,
): React.ComponentProps<typeof Alert>['actions'] => [
  { label: 'Close', role: 'cancel' },
  ...(canRetry(failure)
    ? [{ label: 'Try again', onPress: props.onInstall }]
    : []),
];
const alertContent = (
  props: AgentInstallPresentation,
): Pick<
  React.ComponentProps<typeof Alert>,
  'title' | 'message' | 'actions'
> => {
  const failure =
    props.failure ??
    'Installation interrupted. No new installation was activated.';
  return {
    title: alertTitle(failure),
    message: failure,
    actions: alertActions(props, failure),
  };
};
export function AgentInstallAlert(
  props: AgentInstallPresentation,
): React.JSX.Element {
  return (
    <Alert
      open={props.open}
      onOpenChange={props.onOpenChange}
      {...alertContent(props)}
    />
  );
}
