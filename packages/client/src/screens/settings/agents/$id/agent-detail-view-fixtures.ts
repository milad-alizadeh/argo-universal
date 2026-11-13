import type { AgentDetailViewProps } from './agent-detail-view';

type AgentFixture = AgentDetailViewProps['agent'];

export const agentWithEnvironment = {
  status: 'loaded',
  env: {
    CLAUDE_CODE_ENABLE_TODO_TOOLS: '1',
    HTTPS_PROXY: 'http://proxy.example.com:8080',
  },
} satisfies AgentFixture;

export const agentWithoutEnvironment = {
  status: 'loaded',
  env: {},
} satisfies AgentFixture;
