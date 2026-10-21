import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';
import { installedError, registryError, type RowsLoad } from '#features/agents';

type StateProps = {
  // A load still going draws the loading cards instead, so only a failure is named here.
  load?: Extract<RowsLoad, { status: 'failed' }>;
  empty?: string;
  onRetry?: () => void;
};

const failedMessage = {
  installed: installedError,
  registry: registryError,
} as const;

export function RegistryState(props: StateProps): React.JSX.Element {
  return (
    <View className="min-h-40 items-center justify-center gap-3 p-4">
      <StateMessage {...props} />
      <RetryRegistry {...props} />
    </View>
  );
}

const loadMessage = (load: StateProps['load']): string =>
  load ? failedMessage[load.failed] : '';

function StateMessage(props: StateProps): React.JSX.Element {
  return (
    <Text role="body" tone="muted">
      {props.empty ?? loadMessage(props.load)}
    </Text>
  );
}

function RetryRegistry(props: StateProps): React.JSX.Element | null {
  return props.load ? (
    <Button label="Retry" variant="secondary" onPress={props.onRetry} />
  ) : null;
}
