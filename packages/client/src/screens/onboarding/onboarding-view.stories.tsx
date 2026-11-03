import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { notConnectedGitHub } from './github-step-fixtures';
import { OnboardingView } from './onboarding-view';
import { onboardingArgs } from './onboarding-view.mocks';

const meta = {
  title: 'Screens/Onboarding/Set up Argo',
  component: OnboardingView,
  argTypes: {
    serverName: { control: 'text' },
    agent: { control: false },
    github: { control: false },
  },
  args: onboardingArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof OnboardingView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Onboarding: Story = {};

export const NotInstalled: Story = {
  args: { agent: { status: 'not-installed' } },
};

// What a build without a GitHub sign-in or an Add Project handler shows: their buttons are disabled.
export const FirstRun: Story = {
  args: {
    github: notConnectedGitHub.github,
    onConnectGitHub: undefined,
    onAddProject: undefined,
  },
};
