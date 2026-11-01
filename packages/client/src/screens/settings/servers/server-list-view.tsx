import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import {
  type ServerRow,
  serverListFooter,
  serverStateLabel,
} from './server-rows';

export interface ServerListViewProps {
  // The Server on this Device first, then the Servers it has paired with.
  servers: readonly ServerRow[];
  // The id of the Server the App is showing.
  lookingAt: string;
  // Opens a Server's own page: its state, showing it, and unpairing from it.
  onOpenServer: (id: string) => void;
  // The row below the list, which opens Add a Server. Absent where an App cannot pair: a web page has no camera and no secure storage (ADR-0045).
  onAddServer?: () => void;
}

/*
 * Every Server this App holds a Connection to, each with its own state, and which one it is showing. One Server is
 * the ordinary case: it is one row, not an empty list and not a Server missing.
 */
export function ServerListView(props: ServerListViewProps): React.JSX.Element {
  return (
    <Screen title="Servers" caption="The Argo Servers this App can show.">
      <FieldGroup>
        <FieldGroup.Section footer={serverListFooter}>
          {props.servers.map((server) => serverLink(server, props))}
        </FieldGroup.Section>
        {addServerSection(props.onAddServer)}
      </FieldGroup>
    </Screen>
  );
}

const serverLink = (
  server: ServerRow,
  props: ServerListViewProps,
): React.JSX.Element => (
  <FieldGroup.Link
    key={server.id}
    title={server.name}
    value={rowValue(server, props.lookingAt)}
    leading={{ sf: 'desktopcomputer', material: 'computer' }}
    onPress={() => props.onOpenServer(server.id)}
  />
);

// The row says what the Server is doing, and which one is on show.
const rowValue = (server: ServerRow, lookingAt: string): string =>
  server.id === lookingAt
    ? `Showing · ${serverStateLabel(server.state)}`
    : serverStateLabel(server.state);

// FieldGroup finds its sections by element type, so this is an element built here, not a component.
const addServerSection = (
  onPress: (() => void) | undefined,
): React.JSX.Element | null =>
  onPress ? (
    <FieldGroup.Section>
      <FieldGroup.Link
        title="Add a Server"
        leading={{ sf: 'plus', material: 'add' }}
        action
        onPress={onPress}
      />
    </FieldGroup.Section>
  ) : null;
