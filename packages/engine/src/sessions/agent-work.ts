import type { SubagentRole } from '@repo/contracts';
import type { Todos } from './todos';

// What an Agent tells its own Session about its work through Argo's Operations (ADR-0053).
export type AgentWorkCommand =
  | { type: 'session.declareSubagentRole'; role: SubagentRole }
  | { type: 'session.setTodos'; todos: Todos };

export type AgentWorkState = {
  // The checklist the Agent last set; one step changes against it.
  todos: Todos | null;
};
