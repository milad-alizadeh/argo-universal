import { Icon } from '@repo/kit/primitives/content/icon';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import {
  FieldList,
  type FieldListSection,
} from '#lib/product/field-list/field-list';
import {
  type ServerRow,
  serverListFooter,
  serverStateLabel,
  serverStateTone,
} from './server-rows';

export interface ServerListViewProps {
  // The Server on this Device first, then the Servers it has paired with.
  servers: readonly ServerRow[];
  // The id of the Server the App is showing.
  lookingAt: string;
  // Opens a Server's own page: its state, showing it, and unpairing from it.
  onOpenServer: (id: string) => void;
  // Absent where an App cannot pair: a web page has no camera and no secure storage (ADR-0045).
  onAddServer?: () => void;
}

/*
 * Every Server this App holds a Connection to, each with its own state, and which one it is showing. One Server is
 * the ordinary case: it is one row, not an empty list and not a Server missing.
 */
export function ServerListView(props: ServerListViewProps): React.JSX.Element {
  return (
    <Screen title="Servers" caption="The Argo Servers this App can show.">
      <FieldList sections={sections(props)} />
    </Screen>
  );
}

const sections = (props: ServerListViewProps): FieldListSection[] => [
  {
    rows: props.servers.map((server) => serverItem(server, props)),
    footer: serverListFooter,
  },
  ...addServerSection(props.onAddServer),
];

// Each row says its own state in the subtitle, in the tone of the state: grey for a computer that did not answer, red for one that no longer knows this Device.
const serverItem = (
  server: ServerRow,
  props: ServerListViewProps,
): React.JSX.Element => (
  <ListItem
    key={server.id}
    title={server.name}
    subtitle={serverStateLabel(server.state)}
    subtitleTone={serverStateTone(server.state)}
    value={server.id === props.lookingAt ? 'Showing' : undefined}
    leading={<Icon name="computer" />}
    disclosure
    onPress={() => props.onOpenServer(server.id)}
  />
);

const addServerRow = (onPress: () => void): React.JSX.Element => (
  <ListItem
    key="add"
    title="Add a Server"
    leading={<Icon name="add" />}
    onPress={onPress}
  />
);

const addServerSection = (
  onPress: (() => void) | undefined,
): FieldListSection[] => (onPress ? [{ rows: [addServerRow(onPress)] }] : []);
