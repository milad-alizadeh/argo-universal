import { useQuery } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ConnectionBanner } from '#components/ConnectionBanner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#primitives/card';
import { Text } from '#primitives/text';
import { useTRPC } from '../trpc/context';

// Placeholder until the Connection page is built: the Server's system.info and its live clock.
export function ConnectionScreen() {
  const trpc = useTRPC();
  const info = useQuery(trpc.system.info.queryOptions());
  const clock = useSubscription(trpc.system.clock.subscriptionOptions());

  let serverInformation: ReactNode;
  if (info.isPending) {
    serverInformation = (
      <Text className="text-muted-foreground">Connecting to the Server…</Text>
    );
  } else if (info.isError) {
    serverInformation = (
      <Text className="text-destructive">{info.error.message}</Text>
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
            <CardTitle>Server</CardTitle>
            <CardDescription>The local Argo Server</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">{serverInformation}</CardContent>
        </Card>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className="font-mono text-sm">{value}</Text>
    </View>
  );
}
