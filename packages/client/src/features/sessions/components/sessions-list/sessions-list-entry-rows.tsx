import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { AgentsListOutput } from '@repo/contracts';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';
import type { SessionsListEntry } from '../sessions-list-entries';
import {
  type CollapsedProjects,
  useAnimateReorder,
  useCollapsedProjects,
  useListEntries,
} from './sessions-list-entries-state';
import type { SessionsListProps } from './sessions-list-props';
import {
  NoSessionsYet,
  ProjectListHeading,
  type ProjectListHeadingProps,
  SessionListRow,
} from './sessions-list-rows';

interface SessionRowContext {
  agentLogos: Map<string, string>;
  selectedSessionId?: string;
  onSelect: (id: string) => void;
}

type HeadingContext = Pick<
  ProjectListHeadingProps,
  'onNewSession' | 'onProjectSettings'
> &
  CollapsedProjects;

function useSessionRowContext({
  agents,
  selectedSessionId,
  onSelect,
}: SessionsListProps): SessionRowContext {
  const agentLogos = useMemo(
    () => new Map(agents.map((agent) => [agent.agent, agent.logo])),
    [agents],
  );
  return useMemo(
    () => ({ agentLogos, selectedSessionId, onSelect }),
    [agentLogos, selectedSessionId, onSelect],
  );
}

function useHeadingContext(
  { onNewSession, onProjectSettings }: SessionsListProps,
  { collapsed, toggleProject }: CollapsedProjects,
): HeadingContext {
  return useMemo(
    () => ({ collapsed, toggleProject, onNewSession, onProjectSettings }),
    [collapsed, toggleProject, onNewSession, onProjectSettings],
  );
}

function sessionRow(
  item: Extract<SessionsListEntry, { kind: 'session' }>,
  { agentLogos, selectedSessionId, onSelect }: SessionRowContext,
): React.JSX.Element {
  return (
    <SessionListRow
      session={item.session}
      logo={agentLogos.get(item.session.agent) ?? ''}
      selected={selectedSessionId === item.id}
      onSelect={onSelect}
    />
  );
}

function projectHeading(
  item: Extract<SessionsListEntry, { kind: 'project' }>,
  { collapsed, toggleProject, ...actions }: HeadingContext,
): React.JSX.Element {
  return (
    <ProjectListHeading
      id={item.id}
      projectId={item.projectId}
      name={item.name}
      collapsed={collapsed.has(item.id)}
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
  if (item.kind === 'session') return sessionRow(item, sessionContext);
  return projectHeading(item, headingContext);
}

const noEntries: SessionsListEntry[] = [];

interface ListRows {
  data: SessionsListEntry[];
  extraData: {
    agents: AgentsListOutput;
    collapsed: ReadonlySet<string>;
    selectedSessionId?: string;
  };
  renderItem: (
    props: LegendListRenderItemProps<SessionsListEntry>,
  ) => React.JSX.Element;
}

function useExtraData(
  { agents, selectedSessionId }: SessionsListProps,
  collapsed: ReadonlySet<string>,
): ListRows['extraData'] {
  return useMemo(
    () => ({ agents, collapsed, selectedSessionId }),
    [agents, collapsed, selectedSessionId],
  );
}

function useRenderItem(
  props: SessionsListProps,
  collapsedProjects: CollapsedProjects,
): ListRows['renderItem'] {
  const sessionContext = useSessionRowContext(props);
  const headingContext = useHeadingContext(props, collapsedProjects);
  return useCallback(
    ({ item }: LegendListRenderItemProps<SessionsListEntry>) =>
      renderEntry(item, sessionContext, headingContext),
    [sessionContext, headingContext],
  );
}

export function useListRows(props: SessionsListProps): ListRows {
  const collapsedProjects = useCollapsedProjects();
  const entries = useListEntries(props, collapsedProjects.collapsed);
  useAnimateReorder(entries);
  return {
    data: props.placeholder ? noEntries : entries,
    extraData: useExtraData(props, collapsedProjects.collapsed),
    renderItem: useRenderItem(props, collapsedProjects),
  };
}
