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
import type { ConnectionState } from '../state/context';
import { ConnectionBanner } from './connection-banner';

export type ServerDetails =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'loaded';
      version: string;
      startedAt: string;
      pid: number;
      // The Server's latest clock tick; absent until the first one arrives.
      clock?: string;
    };

// Placeholder until the Connection page is built: the Server's details and its live clock.
export function ConnectionView({
  connection,
  server,
}: {
  connection: ConnectionState;
  server: ServerDetails;
}): React.JSX.Element {
  let serverInformation: ReactNode;
  if (server.status === 'loading') {
    serverInformation = <Text role="secondary">Connecting to the Server…</Text>;
  } else if (server.status === 'error') {
    serverInformation = (
      <Text role="body" className="text-destructive">
        {server.message}
      </Text>
    );
  } else {
    serverInformation = (
      <>
        <Row label="Version" value={server.version} />
        <Row label="Started" value={server.startedAt} />
        <Row label="PID" value={String(server.pid)} />
        <Row label="Clock" value={server.clock ?? '…'} />
      </>
    );
  }
  return (
    <View className="flex-1 bg-background">
      <ConnectionBanner state={connection} />
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
      <Text role="secondary">{label}</Text>
      <Text role="code">{value}</Text>
    </View>
  );
}
