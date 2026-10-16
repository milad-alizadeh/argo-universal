import type { LegendListRenderItemProps } from '@legendapp/list/react-native';
import type { AgentsListOutput } from '@repo/contracts';
import type * as React from 'react';
import { useCallback, useMemo } from 'react';
import { virtualListPosition } from '#primitives/lists/virtual-list-item';
import type { SessionsLayout } from '../../state/sessions-layout';
import { showsSessionAge } from '../session-row/session-row-props';
import type { SessionsListEntry } from '../sessions-list-entries';
import { sessionAge, useAgeFrom } from './session-age';
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
  type SessionListRowProps,
} from './sessions-list-rows';

interface SessionRowContext {
  agentLogos: Map<string, string>;
  layout?: SessionsLayout;
  selectedSessionId?: string;
  // When rows show how long ago they were active, the time that counts from.
  ageFrom?: number;
  onSelect: (id: string) => void;
}

type HeadingContext = Pick<
  ProjectListHeadingProps,
  'onNewSession' | 'onProjectSettings'
> &
  CollapsedProjects;

function useAgentLogos(agents: AgentsListOutput): Map<string, string> {
  return useMemo(
    () => new Map(agents.map((agent) => [agent.agent, agent.logo])),
    [agents],
  );
}

function useSessionRowContext(props: SessionsListProps): SessionRowContext {
  const { agents, layout, selectedSessionId, onSelect } = props;
  const agentLogos = useAgentLogos(agents);
  const ageFrom = useAgeFrom(showsSessionAge(layout, props.flat));

  return useMemo(
    () => ({ agentLogos, layout, selectedSessionId, ageFrom, onSelect }),
    [agentLogos, layout, selectedSessionId, ageFrom, onSelect],
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

function sessionRowProps(
  item: Extract<SessionsListEntry, { kind: 'session' }>,
  context: SessionRowContext,
): SessionListRowProps {
  return {
    session: item.session,
    logo: context.agentLogos.get(item.session.agent) ?? '',
    selected: context.selectedSessionId === item.id,
    trailing: sessionAge(item.session, context.ageFrom),
    layout: context.layout,
    position: virtualListPosition(item.first, item.last),
    onSelect: context.onSelect,
  };
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

  if (item.kind === 'session')
    return <SessionListRow {...sessionRowProps(item, sessionContext)} />;

  return projectHeading(item, headingContext);
}

const noEntries: SessionsListEntry[] = [];

interface ListRows {
  data: SessionsListEntry[];
  extraData: {
    agents: AgentsListOutput;
    collapsed: ReadonlySet<string>;
    selectedSessionId?: string;
    layout?: SessionsLayout;
  };
  renderItem: (
    props: LegendListRenderItemProps<SessionsListEntry>,
  ) => React.JSX.Element;
}

function useExtraData(
  { agents, selectedSessionId, layout }: SessionsListProps,
  collapsed: ReadonlySet<string>,
): ListRows['extraData'] {
  return useMemo(
    () => ({ agents, collapsed, selectedSessionId, layout }),
    [agents, collapsed, selectedSessionId, layout],
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
