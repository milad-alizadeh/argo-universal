import type { AgentServer } from '@repo/contracts';
import { useMemo } from 'react';
import { useClock } from '#lib/generic/use-clock';
import type { SessionsLayout, SessionsOrder } from '../../stores/sessions-view';
import type { SessionsListEntry } from '../sessions-list-entries';
import { sessionAge } from './session-age';
import type { SessionsListProps } from './sessions-list-props';
import type { SessionListRowProps } from './sessions-list-rows';

export interface SessionRowContext {
  agentLogos: Map<string, string>;
  layout: SessionsLayout;
  // The list's order, whose time each row's age counts from.
  order: SessionsOrder;
  selectedSessionId?: string;
  // The time each row's age counts to.
  ageFrom: number;
  // Rows that mount while the list reorders fade in.
  animating: boolean;
  // Projects whose rows are fading out.
  closing: ReadonlySet<string>;
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
}: RowActions): RowActions => ({ onSelect, onRename, onArchive });

function useRowActions(props: SessionsListProps): RowActions {
  const { onSelect, onRename, onArchive } = props;

  return useMemo(
    () => rowActions({ onSelect, onRename, onArchive }),
    [onSelect, onRename, onArchive],
  );
}

// The list's order and the time each row's age counts to; the clock ticks so ages stay current, and memoised rows redraw only when their text changes.
function useRowAge(
  props: SessionsListProps,
): Pick<SessionRowContext, 'order' | 'ageFrom'> {
  const { order } = props.view;
  const ageFrom = useClock(true);

  return useMemo(() => ({ order, ageFrom }), [order, ageFrom]);
}

function useRowInputs(props: SessionsListProps): RowInputs {
  const { selectedSessionId } = props;
  const { layout } = props.view;
  const agentLogos = useAgentLogos(props.agents);
  const age = useRowAge(props);
  const actions = useRowActions(props);

  return useMemo(
    () => ({ agentLogos, layout, selectedSessionId, ...age, ...actions }),
    [agentLogos, layout, selectedSessionId, age, actions],
  );
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
    age: sessionAge(item.session, context.ageFrom, context.order),
    layout: context.layout,
    ...rowMotion(item.session.projectId, context),
    ...rowActions(context),
  };
}
