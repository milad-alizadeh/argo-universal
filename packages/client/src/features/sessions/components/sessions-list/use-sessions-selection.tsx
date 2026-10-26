import { Action } from '@repo/kit/primitives/actions/action';
import type { ListProps } from '@repo/kit/primitives/lists/list';
import { useState, type ReactElement } from 'react';
import type { SessionsListEntry } from '../sessions-list-entries';
import type { SessionsListProps } from './sessions-list-props';

type Selection = Pick<ListProps<SessionsListEntry>, 'selection' | 'actions'>;

interface ArchiveSelectionProps {
  selected: readonly string[];
  onArchive: (ids: readonly string[]) => void;
  clear: () => void;
}

function archiveSelection(props: ArchiveSelectionProps): ReactElement {
  return (
    <Action
      label="Archive"
      icon="archive"
      tone="danger"
      disabled={props.selected.length === 0}
      onPress={() => {
        props.onArchive(props.selected);
        props.clear();
      }}
    />
  );
}

export function useSessionsSelection(props: SessionsListProps): Selection {
  const [selected, onChange] = useState<readonly string[]>([]);

  if (!props.onArchiveMany) return {};

  return {
    selection: { mode: 'multiple', selected, onChange },
    actions: archiveSelection({
      selected,
      onArchive: props.onArchiveMany,
      clear: () => onChange([]),
    }),
  };
}

export function selectionOptions(
  props: SessionsListProps & Selection,
): Pick<
  ListProps<SessionsListEntry>,
  'onEndReached' | 'onRefresh' | 'selection' | 'actions' | 'getSelectionId'
> {
  return {
    onEndReached: props.onEndReached,
    onRefresh: props.onRefresh,
    selection: props.selection,
    actions: props.actions,
    getSelectionId: sessionSelectionId,
  };
}

function sessionSelectionId(entry: SessionsListEntry): string | undefined {
  return entry.kind === 'session' ? entry.session.sessionId : undefined;
}
