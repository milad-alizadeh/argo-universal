export type * from './agent-events';

import type { AnyStateMachine } from 'xstate';
import type { AgentAdapter } from './agent-events';

// Adapter packages add their machines here as they land.
export const agentAdapters: readonly AgentAdapter<AnyStateMachine>[] = [];
