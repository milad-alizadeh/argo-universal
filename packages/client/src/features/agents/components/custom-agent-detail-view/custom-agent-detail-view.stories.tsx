import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import {
  customAgentFailure,
  customAgentDetailArgs,
} from '../custom-agent.mocks';
import { CustomAgentDetailView } from './custom-agent-detail-view';

const meta = {
  title: 'Screens/Settings/Custom Agent',
  component: CustomAgentDetailView,
  args: { ...customAgentDetailArgs(), onSignIn: fn() },
  parameters: { screenPreview: true },
} satisfies Meta<typeof CustomAgentDetailView>;

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

export const SignInRequired: Story = {
  args: { check: { status: 'ready', authentication: 'required' } },
};

export const AccountUnverified: Story = {
  args: { check: { status: 'ready', authentication: 'unverified' } },
};
