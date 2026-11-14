import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { AgentDetailView } from './agent-detail-view';
import {
  agentWithEnvironment,
  agentWithoutEnvironment,
} from './agent-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/Agent',
  component: AgentDetailView,
  argTypes: {
    title: { control: 'text' },
    agent: { control: false },
  },
  parameters: { screenPreview: true },
  args: {
    title: 'Claude Agent',
    agent: agentWithEnvironment,
    onEnvironmentChange: action('change launch environment'),
    onBack: action('back'),
  },
} satisfies Meta<typeof AgentDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoVariables: Story = { args: { agent: agentWithoutEnvironment } };

export const Loading: Story = { args: { agent: { status: 'loading' } } };

export const Missing: Story = {
  args: { title: 'old-agent', agent: { status: 'missing' } },
};
