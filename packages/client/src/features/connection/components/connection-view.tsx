import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { FieldGroup } from '#primitives/field-group';
import { FieldSection } from '#primitives/field-section';
import { ListItem } from '#primitives/list-item';
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

// The Server's details and its live clock, in one grouped section.
export function ConnectionView({
  connection,
  server,
}: {
  connection: ConnectionState;
  server: ServerDetails;
}): React.JSX.Element {
  return (
    <View className="flex-1 bg-background">
      <ConnectionBanner state={connection} />
      <View className="w-full max-w-[720px] flex-1 self-center">
        <FieldGroup>
          <FieldSection title="Server">{serverRows(server)}</FieldSection>
        </FieldGroup>
      </View>
    </View>
  );
}

function serverRows(server: ServerDetails): ReactNode {
  if (server.status === 'loading')
    return <ListItem title="Connecting to the Server…" loading />;
  if (server.status === 'error')
    return <ListItem title={server.message} destructive />;
  return (
    <>
      <ListItem title="Version" value={server.version} />
      <ListItem title="Started" value={server.startedAt} />
      <ListItem title="PID" value={String(server.pid)} />
      <ListItem title="Clock" value={server.clock ?? '…'} />
    </>
  );
}
