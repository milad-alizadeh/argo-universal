import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { AgentDetailView } from './agent-detail-view';
import {
  agentDetailArgs,
  readyAgent,
  signInCommand,
} from './agent-detail.mocks';

const meta = {
  title: 'Screens/Settings/Agent',
  component: AgentDetailView,
  args: agentDetailArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof AgentDetailView>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const NotSignedIn: Story = {
  args: { agent: { ...readyAgent, status: 'sign-in', signInCommand } },
};

export const UpdateAvailable: Story = {
  args: { agent: { ...readyAgent, status: 'update' } },
};

export const FromTheRegistry: Story = {
  args: { agent: { ...readyAgent, status: 'not-installed' }, defaults: [] },
};
