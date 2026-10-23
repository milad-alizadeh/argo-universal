import { Text } from '@repo/kit/primitives/content/text';
import { Callout, CalloutButton } from '@repo/kit/primitives/status/callout';
import type * as React from 'react';
import { View } from 'react-native';
import type { LaunchCalloutProps } from '../../types/session-callout';
import { InstallationProgress } from '../session-callout/installation-progress';

export type { LaunchCalloutProps } from '../../types/session-callout';

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
  <CalloutButton label="Retry" onPress={onRetry} />
);

export interface CalloutLoadingProps {
  // The step running now; with none, the callout reads Loading….
  title?: string;
  // How far the download has got, null while the total is unknown, and nothing at all for a step with no bar.
  progress?: number | null;
}

// While Retry or a sign-in's methods load, the tray or the sheet shows Loading….
export function CalloutLoading({
  title,
  progress,
}: CalloutLoadingProps): React.JSX.Element {
  if (!title) return <Callout busy title="Loading…" />;

  return <LoadingProgress title={title} progress={progress} />;
}

interface LoadingProgressProps {
  title: string;
  progress?: number | null;
}

function LoadingProgress({
  title,
  progress,
}: LoadingProgressProps): React.JSX.Element {
  return (
    <View className="gap-3 p-3">
      <Text role="secondary" tone="muted">
        {title}
      </Text>
      <InstallationProgress progress={progress} />
    </View>
  );
}
