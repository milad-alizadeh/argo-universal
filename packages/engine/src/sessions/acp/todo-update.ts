import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { Todos } from '../todos/todos';

type AcpUpdate = SessionNotification['update'];

// The list as the ACP `plan` update an Agent would send, which the Feed keeps as one row revised in place (ADR-0053).
export const todosUpdate = (
  todos: Todos,
): Extract<AcpUpdate, { sessionUpdate: 'plan' }> => ({
  sessionUpdate: 'plan',
  entries: [...todos],
});

// A checklist an Agent reports through ACP itself; a Written plan is not one.
export const isTodoListUpdate = (update: AcpUpdate): boolean =>
  update.sessionUpdate === 'plan' ||
  (update.sessionUpdate === 'plan_update' && update.plan.type === 'items');
