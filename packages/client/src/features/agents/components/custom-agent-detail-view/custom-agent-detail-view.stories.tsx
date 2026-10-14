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

export const Checking: Story = { args: { readiness: { status: 'checking' } } };

export const CantStart: Story = {
  args: { readiness: { status: 'cant-start', reason: customAgentFailure } },
};

export const NotCustom: Story = {
  args: { agentId: 'example-agent', definition: undefined },
};

export const SignInNeeded: Story = {
  args: {
    readiness: {
      status: 'sign-in-needed',
      reason: 'The Agent requires sign-in.',
    },
  },
};
export const AccountNotSupported: Story = {
  args: {
    readiness: {
      status: 'account-not-supported',
      reason: 'The Agent did not report a compatible subscription account.',
    },
  },
};
