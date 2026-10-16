import type * as React from 'react';
import { Callout, CalloutButton } from '#primitives/display/callout';

export interface LaunchCalloutProps {
  // How the Agent stopped, then the last stderr block; or the error text alone.
  message: string;
  onRetry: () => void;
}

const retryHint = 'Try to restart the Agent';

// Zed's Failed to Launch callout. Retry re-runs the open and never resends a Turn.
export function LaunchCallout(props: LaunchCalloutProps): React.JSX.Element {
  const [description, ...stderr] = props.message.split('\n');

  return (
    <Callout
      tone="danger"
      title="Failed to Launch"
      description={description}
      detail={stderr.join('\n') || undefined}
      actions={<RetryButton onRetry={props.onRetry} />}
    />
  );
}

const RetryButton = ({
  onRetry,
}: Pick<LaunchCalloutProps, 'onRetry'>): React.JSX.Element => (
  <CalloutButton
    label="Retry"
    accessibilityLabel={retryHint}
    onPress={onRetry}
  />
);

// While Retry or a sign-in's methods load, the tray or the sheet shows Loading….
export function CalloutLoading(): React.JSX.Element {
  return <Callout busy title="Loading…" />;
}
