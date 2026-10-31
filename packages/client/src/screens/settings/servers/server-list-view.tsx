import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import {
  type ServerRow,
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
    <Screen title="Servers" caption="The Argo Servers this App can show.">
      <FieldGroup>
        <ServerSection {...props} />
      </FieldGroup>
    </Screen>
  );
}

// The page's title names the section, so the section carries its footer alone.
function ServerSection(props: ServerListViewProps): React.JSX.Element {
  return (
    <FieldGroup.Section footer={shownServerFooter}>
      <FieldGroup.Picker
        title="Servers"
        presentation="inline"
        value={props.lookingAt}
        options={serverOptions(props.servers)}
        onValueChange={(id) => look(props, id)}
      />
    </FieldGroup.Section>
  );
}

// The picker reports the row pressed, the shown one included; looking at the Server already shown is no change.
function look(props: ServerListViewProps, id: string): void {
  if (id !== props.lookingAt) props.onLookAt(id);
}

/*
 * One option per Server, its state under its name. An unreachable Server can still be chosen: choosing it is how the
 * owner asks to see it again once it answers.
 */
const serverOptions = (
  servers: readonly ServerRow[],
): { value: string; label: string; subtitle: string }[] =>
  servers.map((server) => ({
    value: server.id,
    label: server.name,
    subtitle: serverStateLabel(server.state),
  }));
