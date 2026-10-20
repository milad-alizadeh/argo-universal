import type { SessionSnapshot } from '@repo/contracts';
import { useState, type Dispatch, type SetStateAction } from 'react';
import type { ChangesComparison, ChangesViewProps } from '#features/changes';
import type { SessionHeaderProps } from '#features/sessions';
import type { SessionDetailViewProps } from './session-detail-view';
import { useChangesData, useRefreshChanges } from './use-changes-data';

type SessionChanges = {
  header: NonNullable<SessionHeaderProps['changes']>;
  view: ChangesViewProps;
};

type SessionChangesSource = {
  snapshot: SessionSnapshot | null;
  revision: number;
};

type State<T> = [T, Dispatch<SetStateAction<T>>];

type Selection = {
  open: State<boolean>;
  comparison: State<ChangesComparison>;
  viewed: State<readonly string[]>;
};

function useSelection(): Selection {
  return {
    open: useState(false),
    comparison: useState<ChangesComparison>({ kind: 'main' }),
    viewed: useState<readonly string[]>([]),
  };
}

const markViewed = (
  paths: readonly string[],
  path: string,
  marked: boolean,
): readonly string[] =>
  marked
    ? [...paths.filter((value) => value !== path), path]
    : paths.filter((value) => value !== path);

type SelectionProps = Pick<
  ChangesViewProps,
  'comparison' | 'onComparisonChange' | 'viewed' | 'onViewedChange'
>;

function selectionProps(state: Selection): SelectionProps {
  const [comparison, setComparison] = state.comparison;
  const [viewed, setViewed] = state.viewed;

  return {
    comparison,
    viewed,
    onComparisonChange: (next) => {
      setComparison(next);
      setViewed([]);
    },
    onViewedChange: (path, marked) =>
      setViewed((paths) => markViewed(paths, path, marked)),
  };
}

// Feed revisions refresh patches even when an edit keeps the same line totals.
export function useSessionChanges(
  sessionId: string,
  source: SessionChangesSource,
): SessionChanges {
  const state = useSelection();
  const [open, onOpenChange] = state.open;
  const selection = selectionProps(state);
  const input = { sessionId, open, comparison: selection.comparison };
  const data = useChangesData(input);
  useRefreshChanges(input, source);

  return {
    header: { open, onOpenChange, summary: source.snapshot?.changes },
    view: { ...selection, ...data },
  };
}

export function useChangedSession(
  sessionId: string,
  props: SessionDetailViewProps,
  feed: SessionChangesSource,
): SessionDetailViewProps {
  const changes = useSessionChanges(sessionId, feed);

  return props.state === 'open'
    ? {
        ...props,
        changes: changes.view,
        header: { ...props.header, changes: changes.header },
      }
    : props;
}
