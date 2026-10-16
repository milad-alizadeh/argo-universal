import type { AgentsListOutput } from '@repo/contracts';
import { useMemo } from 'react';
import { virtualListPosition } from '#primitives/lists/virtual-list-item';
import type { SessionsLayout } from '../../state/sessions-layout';
import { showsSessionAge } from '../session-row/session-row-props';
import type { SessionsListEntry } from '../sessions-list-entries';
import { sessionAge, useAgeFrom } from './session-age';
import type { SessionsListProps } from './sessions-list-props';
import type { SessionListRowProps } from './sessions-list-rows';

export interface SessionRowContext {
  agentLogos: Map<string, string>;
  layout?: SessionsLayout;
  selectedSessionId?: string;
  // When rows show how long ago they were active, the time that counts from.
  ageFrom?: number;
  // Rows that mount while the list reorders fade in.
  animating: boolean;
  onSelect: (id: string) => void;
}

function useAgentLogos(agents: AgentsListOutput): Map<string, string> {
  return useMemo(
    () => new Map(agents.map((agent) => [agent.agent, agent.logo])),
    [agents],
  );
}

function useSessionRowInputs(
  props: SessionsListProps,
): Omit<SessionRowContext, 'animating'> {
  const { layout, selectedSessionId, onSelect } = props;
  const agentLogos = useAgentLogos(props.agents);
  const ageFrom = useAgeFrom(showsSessionAge(layout, props.flat));

  return { agentLogos, layout, selectedSessionId, ageFrom, onSelect };
}

export function useSessionRowContext(
  props: SessionsListProps,
  animating: boolean,
): SessionRowContext {
  const inputs = useSessionRowInputs(props);

  return useMemo(
    () => ({ ...inputs, animating }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...Object.values(inputs), animating],
  );
}

export function sessionRowProps(
  item: Extract<SessionsListEntry, { kind: 'session' }>,
  context: SessionRowContext,
): SessionListRowProps {
  return {
    session: item.session,
    logo: context.agentLogos.get(item.session.agent) ?? '',
    selected: context.selectedSessionId === item.id,
    trailing: sessionAge(item.session, context.ageFrom),
    layout: context.layout,
    animate: context.animating,
    position: virtualListPosition(item.first, item.last),
    onSelect: context.onSelect,
  };
}
