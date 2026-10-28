import type { AgentServer } from '@repo/contracts';
import { useClock } from '@repo/kit/use-clock';
import { useMemo } from 'react';
import type { SessionsLayout } from '../../stores/sessions-view';
import type { SessionsListEntry } from '../sessions-list-entries';
import { sessionAge } from './session-age';
import type {
  SessionsListPlugins,
  SessionsListProps,
} from './sessions-list-props';
import type { SessionListRowProps } from './sessions-list-rows';

export interface SessionRowContext {
  agentLogos: Map<string, string>;
  layout: SessionsLayout;
  selectedSessionId?: string;
  // The time each row's age counts to.
  ageFrom: number;
  // Rows that mount while the list reorders fade in.
  animating: boolean;
  // Projects whose rows are fading out.
  closing: ReadonlySet<string>;
  plugins?: SessionsListPlugins;
  onSelect: (id: string) => void;
  onRename?: (id: string) => void;
  onArchive?: (id: string) => void;
}

function useAgentLogos(agents: AgentServer[]): Map<string, string> {
  return useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent.icon ?? ''])),
    [agents],
  );
}

type RowInputs = Omit<SessionRowContext, 'animating' | 'closing'>;

type RowActions = Pick<
  SessionRowContext,
  'onSelect' | 'onRename' | 'onArchive'
>;

const rowActions = ({
  onSelect,
  onRename,
  onArchive,
}: RowActions): RowActions => ({
  onSelect,
  onRename,
  onArchive,
});

function useRowActions(props: SessionsListProps): RowActions {
  const { onSelect, onRename, onArchive } = props;

  return useMemo(
    () => rowActions({ onSelect, onRename, onArchive }),
    [onSelect, onRename, onArchive],
  );
}

// The time each row's age counts to; the clock ticks so ages stay current, and memoised rows redraw only when their text changes.
function useRowAge(): Pick<SessionRowContext, 'ageFrom'> {
  const ageFrom = useClock(true);

  return useMemo(() => ({ ageFrom }), [ageFrom]);
}

// What every row draws from the list's props: the Agents, the layout, the open Session and the Plugins' content.
export interface ListRowData {
  agents: AgentServer[];
  layout: SessionsLayout;
  selectedSessionId?: string;
  plugins?: SessionsListPlugins;
}

// One memo for the list's redraws and the rows' context, so a change to any of these redraws the rows once.
export function useListRowData(props: SessionsListProps): ListRowData {
  const { agents, selectedSessionId, plugins } = props;
  const { layout } = props.view;

  return useMemo(
    () => ({ agents, layout, selectedSessionId, plugins }),
    [agents, layout, selectedSessionId, plugins],
  );
}

type RowData = Pick<
  RowInputs,
  'agentLogos' | 'layout' | 'selectedSessionId' | 'plugins'
>;

const rowData = (
  { agents: _agents, ...drawing }: ListRowData,
  agentLogos: Map<string, string>,
): RowData => ({ ...drawing, agentLogos });

function useRowData(data: ListRowData): RowData {
  const agentLogos = useAgentLogos(data.agents);

  return useMemo(() => rowData(data, agentLogos), [data, agentLogos]);
}

function useRowInputs(
  props: SessionsListProps,
  listData: ListRowData,
): RowInputs {
  const data = useRowData(listData);
  const age = useRowAge();
  const actions = useRowActions(props);

  return useMemo(() => ({ ...data, ...age, ...actions }), [data, age, actions]);
}

export function useSessionRowContext(
  props: SessionsListProps,
  listData: ListRowData,
  motion: Pick<SessionRowContext, 'animating' | 'closing'>,
): SessionRowContext {
  const inputs = useRowInputs(props, listData);
  const { animating, closing } = motion;

  return useMemo(
    () => ({ ...inputs, animating, closing }),
    [inputs, animating, closing],
  );
}

function rowMotion(
  projectId: string,
  context: SessionRowContext,
): Pick<SessionListRowProps, 'animate' | 'closing'> {
  return {
    animate: context.animating,
    closing: context.closing.has(`project:${projectId}`),
  };
}

// What the Plugins add to one row, and the page its items open.
function rowPlugins(
  sessionId: string,
  plugins: SessionsListPlugins | undefined,
): Pick<SessionListRowProps, 'plugins' | 'onOpenPluginPage'> {
  if (!plugins) return {};

  return {
    plugins: plugins.rows.get(sessionId),
    onOpenPluginPage: plugins.openPage,
  };
}

export function sessionRowProps(
  item: Extract<SessionsListEntry, { kind: 'session' }>,
  context: SessionRowContext,
): SessionListRowProps {
  return {
    session: item.session,
    logo: context.agentLogos.get(item.session.agent) ?? '',
    selected: context.selectedSessionId === item.id,
    age: sessionAge(item.session, context.ageFrom),
    layout: context.layout,
    ...rowPlugins(item.session.sessionId, context.plugins),
    ...rowMotion(item.session.projectId, context),
    ...rowActions(context),
  };
}
