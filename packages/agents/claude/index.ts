import type { AgentAdapter } from '../src/agent-events';
import { claudeCapabilities, claudeMachine } from './machine';

export const claudeAdapter: AgentAdapter<typeof claudeMachine> = {
  agent: 'claude',
  capabilities: claudeCapabilities,
  machine: claudeMachine,
};
