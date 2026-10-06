import { readFileSync } from 'node:fs';
import type { AgentAdapter } from '../src/agent-adapter';
import { connect } from './connect';
import type { VendorMessage } from './messages';
import { probe } from './probe';
import {
  initialMappingState,
  type MappingState,
  toAgentEvents,
} from './to-agent-events';

export const claudeAdapter: AgentAdapter<VendorMessage, MappingState> = {
  agent: 'claude',
  label: 'Claude',
  logo: readFileSync(
    new URL('./assets/claude-spark.svg', import.meta.url),
    'utf8',
  ),
  probe,
  connect,
  initialMappingState,
  toAgentEvents,
};
