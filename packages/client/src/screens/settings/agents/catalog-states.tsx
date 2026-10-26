import { Button } from '@repo/kit/primitives/actions/button';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type * as React from 'react';
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

// The kit's empty state, which owns its spacing: what is missing, and Retry when a load failed.
export function RegistryState(props: StateProps): React.JSX.Element {
  return (
    <EmptyState
      title={props.empty ?? loadMessage(props.load)}
      action={retryRegistry(props)}
    />
  );
}

const loadMessage = (load: StateProps['load']): string =>
  load ? failedMessage[load.failed] : '';

const retryRegistry = (props: StateProps): React.JSX.Element | undefined =>
  props.load ? (
    <Button label="Retry" variant="secondary" onPress={props.onRetry} />
  ) : undefined;
