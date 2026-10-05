import { claudeAdapter } from '../claude';
import type { AgentAdapter } from './agent-adapter';
import { createAgentMachine } from './agent-machine';

// Every Agent adapter the Server can start, the one place outside an adapter that names its vendor.
export const agentAdapters: readonly AgentAdapter[] = [claudeAdapter];

export const agentMachine = createAgentMachine(agentAdapters);
