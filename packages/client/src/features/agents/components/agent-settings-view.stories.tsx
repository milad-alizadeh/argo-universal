import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { AgentSettingsView } from './agent-settings-view';
import {
  customAgentDefinition,
  customAgentFailure,
  customAgentId,
  registers,
} from './custom-agent.mocks';

const meta = {
  title: 'Screens/AgentSettingsScreen',
  component: AgentSettingsView,
  args: {
    agentId: customAgentId,
    definition: customAgentDefinition,
    check: { status: 'ready' },
    onCheck: fn(),
    onSave: registers(),
  },
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
