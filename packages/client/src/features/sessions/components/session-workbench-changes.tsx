import { Text } from '@repo/kit/primitives/content/text';
import { useState, type ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { ChangeRow } from './change-row';
import type { SessionPullRequest } from './session-pull-request';
import { previewLimit } from './workbench-preview';

interface Props {
  changes: readonly SessionPullRequest[];
  // A row opens its own Change on its code host.
  onOpenChange: (change: SessionPullRequest) => void;
}

// Equal numbers in two repositories are two Changes; the Plugin's id tells them apart where it gave one.
const keyOf = (change: SessionPullRequest): string =>
  change.id ?? String(change.number);

// "Show more" and "Show less" take the Feed's "Show more" look: plain muted text, pressed as a button.
function Toggle(props: {
  expanded: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable role="button" onPress={props.onPress} className="px-1 py-2">
      <Text role="body" tone="muted">
        {props.expanded ? 'Show less' : 'Show more'}
      </Text>
    </Pressable>
  );
}

const rowsOf = (
  changes: readonly SessionPullRequest[],
  onOpenChange: Props['onOpenChange'],
): ReactElement[] =>
  changes.map((change) => (
    <ChangeRow
      key={keyOf(change)}
      change={change}
      onOpen={() => onOpenChange(change)}
    />
  ));

// Up to three Changes, then Show more for all of them and Show less to go back.
export function WorkbenchChangeRows(props: Props): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const { changes } = props;
  const shown = expanded ? changes : changes.slice(0, previewLimit);

  return (
    <View>
      {rowsOf(shown, props.onOpenChange)}
      {changes.length > previewLimit && (
        <Toggle expanded={expanded} onPress={() => setExpanded(!expanded)} />
      )}
    </View>
  );
}
