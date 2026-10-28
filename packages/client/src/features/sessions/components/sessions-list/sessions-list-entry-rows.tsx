import type * as React from 'react';
import { useCallback, useMemo } from 'react';
import type { SessionsListEntry } from '../sessions-list-entries';
import {
  type CollapsedProjects,
  useCollapsedProjects,
} from './sessions-list-collapsed';
import { useListEntries } from './sessions-list-entries-state';
import type { SessionsListProps } from './sessions-list-props';
import { useAnimateReorder } from './sessions-list-reorder';
import {
  type ListRowData,
  type SessionRowContext,
  sessionRowProps,
  useListRowData,
  useSessionRowContext,
} from './sessions-list-row-context';
import {
  NoSessionsYet,
  ProjectListHeading,
  type ProjectListHeadingProps,
  SessionListRow,
} from './sessions-list-rows';

type HeadingContext = Pick<
  ProjectListHeadingProps,
  'onNewSession' | 'onProjectSettings'
> &
  CollapsedProjects;

function useHeadingContext(
  { onNewSession, onProjectSettings }: SessionsListProps,
  { collapsed, closing, toggleProject }: CollapsedProjects,
): HeadingContext {
  return useMemo(
    () => ({
      collapsed,
      closing,
      toggleProject,
      onNewSession,
      onProjectSettings,
    }),
    [collapsed, closing, toggleProject, onNewSession, onProjectSettings],
  );
}

function projectHeading(
  item: Extract<SessionsListEntry, { kind: 'project' }>,
  { collapsed, closing, toggleProject, ...actions }: HeadingContext,
): React.JSX.Element {
  return (
    <ProjectListHeading
      id={item.id}
      projectId={item.projectId}
      name={item.name}
      collapsed={collapsed.has(item.id) || closing.has(item.id)}
      onToggle={toggleProject}
      {...actions}
    />
  );
}

function renderEntry(
  item: SessionsListEntry,
  sessionContext: SessionRowContext,
  headingContext: HeadingContext,
): React.JSX.Element {
  if (item.kind === 'empty') return <NoSessionsYet />;

  if (item.kind === 'session')
    return <SessionListRow {...sessionRowProps(item, sessionContext)} />;

  return projectHeading(item, headingContext);
}

const noEntries: SessionsListEntry[] = [];

export interface ListRows {
  // Whether the list is moving rows now.
  animating: boolean;
  items: SessionsListEntry[];
  extraData: ListRowData & {
    collapsed: ReadonlySet<string>;
    closing: ReadonlySet<string>;
  };
  renderItem: (item: SessionsListEntry, index: number) => React.JSX.Element;
}

// What every row draws from the list; a change to any redraws the rows.
function useExtraData(
  rows: ListRowData,
  { collapsed, closing }: CollapsedProjects,
): ListRows['extraData'] {
  return useMemo(
    () => ({ ...rows, collapsed, closing }),
    [rows, collapsed, closing],
  );
}

interface RenderInputs {
  rows: ListRowData;
  collapsedProjects: CollapsedProjects;
  animating: boolean;
}

function useRenderItem(
  props: SessionsListProps,
  { rows, collapsedProjects, animating }: RenderInputs,
): ListRows['renderItem'] {
  const { closing } = collapsedProjects;
  const motion = { animating, closing };
  const sessionContext = useSessionRowContext(props, rows, motion);
  const headingContext = useHeadingContext(props, collapsedProjects);

  return useCallback(
    (item: SessionsListEntry) =>
      renderEntry(item, sessionContext, headingContext),
    [sessionContext, headingContext],
  );
}

export function useListRows(props: SessionsListProps): ListRows {
  const collapsedProjects = useCollapsedProjects();
  const entries = useListEntries(props, collapsedProjects.collapsed);
  const animating = useAnimateReorder(entries);
  const rows = useListRowData(props);

  return {
    animating,
    items: props.placeholder ? noEntries : entries,
    extraData: useExtraData(rows, collapsedProjects),
    renderItem: useRenderItem(props, { rows, collapsedProjects, animating }),
  };
}
