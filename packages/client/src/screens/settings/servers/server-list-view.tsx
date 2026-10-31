import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import {
  type ServerRow,
  serverBadge,
  serverRowName,
  serverStateLabel,
  shownServerFooter,
} from './server-rows';

export interface ServerListViewProps {
  // The Server on this Device first, then the Servers it has paired with.
  servers: readonly ServerRow[];
  // The id of the Server the App is showing.
  lookingAt: string;
  onLookAt: (id: string) => void;
}

/*
 * Every Server this App holds a Connection to, each with its own state, and which one it is showing. One Server is
 * the ordinary case: it is one chosen row, not an empty list and not a Server missing.
 */
export function ServerListView(props: ServerListViewProps): React.JSX.Element {
  return (
    <Screen
      title="Servers"
      caption="The Argo Servers this App can show. Choose one to read its Sessions."
    >
      <List appearance="grouped">
        <ServerSection {...props} />
      </List>
    </Screen>
  );
}

function ServerSection(props: ServerListViewProps): React.JSX.Element {
  return (
    <ListSection
      title="Servers"
      footer={shownServerFooter(props.servers, props.lookingAt)}
      selectionMode="single"
      selection={[props.lookingAt]}
      onSelectionChange={(ids) => look(props, ids)}
    >
      {props.servers.map((server) => (
        <ServerListRow key={server.id} {...server} />
      ))}
    </ListSection>
  );
}

// The section reports every chosen id; only a Server it holds can have been pressed, and the shown one stays shown.
function look(props: ServerListViewProps, ids: readonly string[]): void {
  const chosen = ids.find((id) => id !== props.lookingAt);

  if (chosen) props.onLookAt(chosen);
}

const ServerListRow = (row: ServerRow): React.JSX.Element => (
  <ListItem
    id={row.id}
    title={row.name}
    value={serverStateLabel(row.state)}
    badge={serverBadge(row.state)}
    accessibilityLabel={serverRowName(row)}
  />
);
