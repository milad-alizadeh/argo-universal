import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { AgentAdapter } from '../src/agent-adapter';
import { connect } from './connect';
import {
  initialMappingState,
  type MappingState,
  toAgentEvents,
} from './to-agent-events';

export const claudeAdapter: AgentAdapter<SDKMessage, MappingState> = {
  agent: 'claude',
  connect,
  initialMappingState,
  toAgentEvents,
};
