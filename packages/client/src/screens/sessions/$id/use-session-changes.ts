import type { SessionSnapshot } from '@repo/contracts';
import { useState, type Dispatch, type SetStateAction } from 'react';
import type { ChangesComparison, ChangesViewProps } from '#features/changes';
import {
  type SessionHeaderProps,
  type SessionPanels,
} from '#features/sessions';
import type { SessionDetailViewProps } from './session-detail-view';
import { useChangesData, useRefreshChanges } from './use-changes-data';
import { useInspectorPanels } from './use-inspector-panels';

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
  comparison: State<ChangesComparison>;
  viewed: State<readonly string[]>;
};

function useSelection(): Selection {
  return {
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
  panels: SessionPanels,
): SessionChanges {
  const header = changesHeader(panels, source);

  const selection = selectionProps(useSelection());
  const input = { sessionId, ...changesInput(header, selection) };

  const data = useChangesData(input);
  useRefreshChanges(input, source);

  return {
    header,
    view: { ...selection, ...data },
  };
}

const changesInput = (
  header: SessionChanges['header'],
  selection: SelectionProps,
): Pick<Parameters<typeof useChangesData>[0], 'open' | 'comparison'> => ({
  open: header.open,
  comparison: selection.comparison,
});

const changesHeader = (
  panels: SessionPanels,
  source: SessionChangesSource,
): SessionChanges['header'] => ({
  open: panels.state.shown === 'changes',
  onOpenChange: (shown) =>
    shown ? panels.select('changes') : panels.close('changes'),
  summary: source.snapshot?.changes,
});

export function useChangedSession(
  sessionId: string,
  props: SessionDetailViewProps,
  feed: SessionChangesSource,
): SessionDetailViewProps {
  const panels = useInspectorPanels(props.state === 'open' ? props : {});

  const changes = useSessionChanges(sessionId, feed, panels);

  return changedSession(props, panels, changes);
}

function changedSession(
  props: SessionDetailViewProps,
  panels: SessionPanels,
  changes: SessionChanges,
): SessionDetailViewProps {
  return props.state === 'open'
    ? {
        ...props,
        inspectorPanels: panels,
        changes: changes.view,
        header: { ...props.header, changes: changes.header },
      }
    : props;
}
