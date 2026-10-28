import type { AgentServer } from '@repo/contracts';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';
import type { SessionsLayout } from '../../stores/sessions-view';
import type { SessionsListEntry } from '../sessions-list-entries';
import {
  type CollapsedProjects,
  useCollapsedProjects,
} from './sessions-list-collapsed';
import type { SessionsListProps } from './sessions-list-props';
import { useAnimateReorder } from './sessions-list-reorder';
import {
  type SessionRowContext,
  sessionRowProps,
  useSessionRowContext,
} from './sessions-list-row-context';
import {
  NoSessionsYet,
  ProjectListHeading,
  type ProjectListHeadingProps,
  SessionListRow,
} from './sessions-list-rows';
import {
  sessionTree,
  useSessionNesting,
  useNestedEntries,
  type SessionNesting,
} from './sessions-list-tree';

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

type EntryContext = {
  sessionContext: SessionRowContext;
  headingContext: HeadingContext;
  nesting: SessionNesting;
};

function renderEntry(
  item: SessionsListEntry,
  { sessionContext, headingContext, nesting }: EntryContext,
): React.JSX.Element {
  if (item.kind === 'empty') return <NoSessionsYet />;

  if (item.kind === 'session')
    return (
      <SessionListRow
        {...sessionRowProps(item, sessionContext)}
        tree={sessionTree(item, nesting)}
      />
    );

  return projectHeading(item, headingContext);
}

const noEntries: SessionsListEntry[] = [];

export interface ListRows {
  // Whether the list is moving rows now.
  animating: boolean;
  items: SessionsListEntry[];
  extraData: {
    agents: AgentServer[];
    collapsed: ReadonlySet<string>;
    closing: ReadonlySet<string>;
    selectedSessionId?: string;
    layout: SessionsLayout;
    rowPlugins?: SessionsListProps['rowPlugins'];
  };
  renderItem: (item: SessionsListEntry, index: number) => React.JSX.Element;
}

type RowsData = Omit<ListRows['extraData'], 'collapsed' | 'closing'>;

// What every row draws from the list's props; a change to any redraws the rows.
function useRowsData(props: SessionsListProps): RowsData {
  const { agents, selectedSessionId, rowPlugins } = props;
  const { layout } = props.view;

  return useMemo(
    () => ({ agents, selectedSessionId, layout, rowPlugins }),
    [agents, selectedSessionId, layout, rowPlugins],
  );
}

function useExtraData(
  props: SessionsListProps,
  { collapsed, closing }: CollapsedProjects,
): ListRows['extraData'] {
  const rows = useRowsData(props);

  return useMemo(
    () => ({ ...rows, collapsed, closing }),
    [rows, collapsed, closing],
  );
}

function useRenderItem(
  props: SessionsListProps,
  collapsedProjects: CollapsedProjects,
  { animating, nesting }: { animating: boolean; nesting: SessionNesting },
): ListRows['renderItem'] {
  const { closing } = collapsedProjects;
  const sessionContext = useSessionRowContext(props, animating, closing);
  const headingContext = useHeadingContext(props, collapsedProjects);

  return useCallback(
    (item: SessionsListEntry) =>
      renderEntry(item, { sessionContext, headingContext, nesting }),
    [sessionContext, headingContext, nesting],
  );
}

export function useListRows(
  props: SessionsListProps,
  treeDrawn: boolean,
): ListRows {
  const collapsedProjects = useCollapsedProjects();

  const nesting = useSessionNesting(treeDrawn);

  const entries = useNestedEntries(props, collapsedProjects.collapsed, nesting);

  const animating = useAnimateReorder(entries);

  return {
    animating,
    items: props.placeholder ? noEntries : entries,
    extraData: useExtraData(props, collapsedProjects),
    renderItem: useRenderItem(props, collapsedProjects, { animating, nesting }),
  };
}
