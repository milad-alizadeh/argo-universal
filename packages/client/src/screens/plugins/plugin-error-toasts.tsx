import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import { useSubscription } from '@trpc/tanstack-react-query';
import type * as React from 'react';
import { useState } from 'react';
import { useTRPC, useResubscribeOnReconnect } from '#features/connection';
import { useErrorToast } from '#primitives/overlays/toast';

// One watcher in the Frame reports crashes even when a Plugin's page is closed.
export function PluginErrorToasts(): React.ReactNode {
  const [failures, setFailures] = useState<PluginFailure[]>([]);

  const subscription = useSubscription(
    useTRPC().plugins.failures.subscriptionOptions(undefined, {
      onData: setFailures,
    }),
  );

  useResubscribeOnReconnect(subscription);

  return failures.map((failure) => (
    <PluginErrorToast key={failure.pluginId} failure={failure} />
  ));
}

function PluginErrorToast({ failure }: { failure: PluginFailure }): null {
  useErrorToast({
    title: `${failure.name} stopped`,
    message: failure.message,
    key: failure.key,
  });

  return null;
}
