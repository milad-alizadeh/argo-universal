import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AgentSettingsView } from './agent-settings-view';
import { customAgentFailure, agentSettingsArgs } from './custom-agent.mocks';

const meta = {
  title: 'Screens/AgentSettingsScreen',
  component: AgentSettingsView,
  args: agentSettingsArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentSettingsView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Checking: Story = { args: { check: undefined } };

export const CheckFailed: Story = {
  args: { check: { status: 'failed', failure: customAgentFailure } },
};

export const NotCustom: Story = {
  args: { agentId: 'example-agent', definition: undefined },
};
