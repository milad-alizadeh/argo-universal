import { useQuery } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#lib/generic/primitives/card';
import { Text } from '#lib/generic/primitives/text';
import { ConnectionBanner } from '../components/connection-banner';
import { useTRPC } from '../trpc/context';

// Placeholder until the Connection page is built: the Server's system.info and its live clock.
export function ConnectionScreen(): React.JSX.Element {
  const trpc = useTRPC();
  const info = useQuery(trpc.system.info.queryOptions());
  const clock = useSubscription(trpc.system.clock.subscriptionOptions());

  let serverInformation: ReactNode;
  if (info.isPending) {
    serverInformation = (
      <Text className="type-secondary">Connecting to the Server…</Text>
    );
  } else if (info.isError) {
    serverInformation = (
      <Text className="type-body text-destructive">{info.error.message}</Text>
    );
  } else {
    serverInformation = (
      <>
        <Row label="Version" value={info.data.version} />
        <Row label="Started" value={info.data.startedAt} />
        <Row label="PID" value={String(info.data.pid)} />
        <Row label="Clock" value={clock.data?.now ?? '…'} />
      </>
    );
  }
  return (
    <View className="flex-1 bg-background">
      <ConnectionBanner />
      <View className="flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="type-heading">Server</CardTitle>
            <CardDescription className="type-secondary">
              The local Argo Server
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">{serverInformation}</CardContent>
        </Card>
      </View>
    </View>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="type-secondary">{label}</Text>
      <Text className="type-code">{value}</Text>
    </View>
  );
}
