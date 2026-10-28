import type { AgentServer } from '@repo/contracts';
import { useClock } from '@repo/kit/use-clock';
import { useMemo } from 'react';
import type { SessionsLayout } from '../../stores/sessions-view';
import type {
  OpenPluginPage,
  SessionRowPlugins,
} from '../session-row/session-row-props';
import type { SessionsListEntry } from '../sessions-list-entries';
import { sessionAge } from './session-age';
import type { SessionsListProps } from './sessions-list-props';
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
  rowPlugins?: ReadonlyMap<string, SessionRowPlugins>;
  onOpenPluginPage?: OpenPluginPage;
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
  'onSelect' | 'onRename' | 'onArchive' | 'onOpenPluginPage'
>;

const rowActions = ({
  onSelect,
  onRename,
  onArchive,
  onOpenPluginPage,
}: RowActions): RowActions => ({
  onSelect,
  onRename,
  onArchive,
  onOpenPluginPage,
});

function useRowActions(props: SessionsListProps): RowActions {
  const { onSelect, onRename, onArchive, onOpenPluginPage } = props;

  return useMemo(
    () => rowActions({ onSelect, onRename, onArchive, onOpenPluginPage }),
    [onSelect, onRename, onArchive, onOpenPluginPage],
  );
}

// The time each row's age counts to; the clock ticks so ages stay current, and memoised rows redraw only when their text changes.
function useRowAge(): Pick<SessionRowContext, 'ageFrom'> {
  const ageFrom = useClock(true);

  return useMemo(() => ({ ageFrom }), [ageFrom]);
}

type RowData = Pick<
  RowInputs,
  'agentLogos' | 'layout' | 'selectedSessionId' | 'rowPlugins'
>;

// What every row reads from the list: Agent logos, the layout, the open Session and the Plugins' content.
function useRowData(props: SessionsListProps): RowData {
  const { selectedSessionId, rowPlugins } = props;
  const { layout } = props.view;
  const agentLogos = useAgentLogos(props.agents);

  return useMemo(
    () => ({ agentLogos, layout, selectedSessionId, rowPlugins }),
    [agentLogos, layout, selectedSessionId, rowPlugins],
  );
}

function useRowInputs(props: SessionsListProps): RowInputs {
  const data = useRowData(props);
  const age = useRowAge();
  const actions = useRowActions(props);

  return useMemo(() => ({ ...data, ...age, ...actions }), [data, age, actions]);
}

export function useSessionRowContext(
  props: SessionsListProps,
  animating: boolean,
  closing: ReadonlySet<string>,
): SessionRowContext {
  const inputs = useRowInputs(props);

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
    plugins: context.rowPlugins?.get(item.session.sessionId),
    ...rowMotion(item.session.projectId, context),
    ...rowActions(context),
  };
}
