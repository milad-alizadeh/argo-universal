import { Action } from '@repo/kit/primitives/actions/action';
import type { ListProps } from '@repo/kit/primitives/lists/list';
import { useState, type ReactElement } from 'react';
import type { SessionsListEntry } from '../sessions-list-entries';
import type { SessionsListProps } from './sessions-list-props';

type Selection = Pick<ListProps<SessionsListEntry>, 'selection' | 'actions'>;

// The List disables an Action while nothing is selected and closes selection once it has run.
function archiveSelection(
  selected: readonly string[],
  onArchive: (ids: readonly string[]) => void,
): ReactElement {
  return (
    <Action
      label="Archive"
      icon="archive"
      tone="danger"
      onPress={() => onArchive(selected)}
    />
  );
}

export function useSessionsSelection(props: SessionsListProps): Selection {
  const [selected, onChange] = useState<readonly string[]>([]);

  if (!props.onArchiveMany) return {};

  return {
    selection: { mode: 'multiple', selected, onChange },
    actions: archiveSelection(selected, props.onArchiveMany),
  };
}

export function sessionsListBehaviours(
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

// Only an active Session can be archived, so an archived row is never selected.
function sessionSelectionId(entry: SessionsListEntry): string | undefined {
  if (entry.kind !== 'session') return undefined;

  return entry.session.archivedAt === null
    ? entry.session.sessionId
    : undefined;
}
