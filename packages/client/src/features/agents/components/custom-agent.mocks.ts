import type { AgentRegistration, CustomAgentDefinition } from '@repo/contracts';
import { fn, type Mock } from 'storybook/test';
import type { SubmitCustomAgent } from '../hooks/use-custom-agent-form';
import type { AgentSettingsViewProps } from './agent-settings-view';

export const customAgentId = 'custom-agent-1';
export const customAgentDefinition: CustomAgentDefinition = {
  name: 'Example ACP',
  executable: '/opt/homebrew/bin/example-acp',
  args: ['--experimental-acp', '--model', 'example-pro'],
  env: [{ name: 'EXAMPLE_HOME', value: '/Users/example/.example' }],
};
export const customAgentFailure =
  '/opt/homebrew/bin/example-acp was not found.';

const registered: AgentRegistration = {
  status: 'ready',
  agentId: customAgentId,
};
const checkFailed: AgentRegistration = {
  status: 'failed',
  failure: customAgentFailure,
};
// Spies for the form's submit: the Server saves the Agent, or its check fails.
export const registers = (): Mock<SubmitCustomAgent> =>
  fn<SubmitCustomAgent>(() => Promise.resolve(registered));
export const failsItsCheck = (): Mock<SubmitCustomAgent> =>
  fn<SubmitCustomAgent>(() => Promise.resolve(checkFailed));

// A saved custom Agent whose program answered its check, with callback spies.
export const agentSettingsArgs = (): AgentSettingsViewProps => ({
  agentId: customAgentId,
  definition: customAgentDefinition,
  check: { status: 'ready' },
  onCheck: fn(),
  onSave: registers(),
});
