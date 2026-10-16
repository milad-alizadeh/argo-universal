import type * as React from 'react';
import { View } from 'react-native';
import { registryError } from '#features/agents';
import { Button } from '#primitives/buttons/button';
import { Spinner } from '#primitives/display/spinner';
import { Text } from '#primitives/display/text';

type StateProps = {
  status?: 'loading' | 'failed';
  empty?: string;
  onRetry?: () => void;
};

export function RegistryState(props: StateProps): React.JSX.Element {
  return (
    <View className="min-h-40 items-center justify-center gap-3 p-4">
      {props.status === 'loading' && (
        <Spinner accessibilityLabel="Loading Registry…" />
      )}
      <StateMessage {...props} />
      <RetryRegistry {...props} />
    </View>
  );
}

function StateMessage(props: StateProps): React.JSX.Element {
  const message =
    props.status === 'loading' ? 'Loading Registry…' : registryError;

  return (
    <Text role="body" tone="muted">
      {props.empty ?? message}
    </Text>
  );
}

function RetryRegistry(props: StateProps): React.JSX.Element | null {
  return props.status === 'failed' ? (
    <Button label="Retry" variant="secondary" onPress={props.onRetry} />
  ) : null;
}
