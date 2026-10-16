import type * as React from 'react';
import { Button } from '#primitives/buttons/button';
import { Callout } from '#primitives/display/callout';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';

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
      actions={<RetryButton {...props} />}
    />
  );
}

function RetryButton({
  onRetry,
}: Pick<LaunchCalloutProps, 'onRetry'>): React.JSX.Element {
  return (
    <Button
      size="sm"
      fullWidth="narrow"
      label="Retry"
      accessibilityLabel={retryHint}
      onPress={onRetry}
    />
  );
}

// While Retry runs a wide window keeps the tray with Loading…; a phone closes the sheet.
export function CalloutLoading(): React.JSX.Element | null {
  if (!useWide()) return null;

  return <Callout busy title="Loading…" />;
}
