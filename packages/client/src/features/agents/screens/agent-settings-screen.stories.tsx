import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  customAgentFailure,
  customAgentId,
  customAgentMocks,
} from '../../../../mocks/custom-agent-mock';
import { AgentSettingsScreen } from './agent-settings-screen';

const meta = {
  title: 'Screens/AgentSettingsScreen',
  component: AgentSettingsScreen,
  args: { agent: customAgentId },
  parameters: { trpc: customAgentMocks, screenPreview: true },
} satisfies Meta<typeof AgentSettingsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = { name: 'AgentSettingsScreen' };

export const CheckFailed: Story = {
  parameters: {
    trpc: {
      ...customAgentMocks,
      'agents.check': () => ({ status: 'failed', failure: customAgentFailure }),
    },
  },
};
