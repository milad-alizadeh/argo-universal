import type * as React from 'react';
import { View } from 'react-native';
import { installedError, registryError, type RowsLoad } from '#features/agents';
import { Button } from '#primitives/buttons/button';
import { Spinner } from '#primitives/display/spinner';
import { Text } from '#primitives/display/text';

type StateProps = {
  load?: Exclude<RowsLoad, { status: 'loaded' }>;
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
      {props.load?.status === 'loading' && (
        <Spinner accessibilityLabel="Loading Registry…" />
      )}
      <StateMessage {...props} />
      <RetryRegistry {...props} />
    </View>
  );
}

const loadMessage = (load: StateProps['load']): string =>
  load?.status === 'failed' ? failedMessage[load.failed] : 'Loading Registry…';

function StateMessage(props: StateProps): React.JSX.Element {
  return (
    <Text role="body" tone="muted">
      {props.empty ?? loadMessage(props.load)}
    </Text>
  );
}

function RetryRegistry(props: StateProps): React.JSX.Element | null {
  return props.load?.status === 'failed' ? (
    <Button label="Retry" variant="secondary" onPress={props.onRetry} />
  ) : null;
}
