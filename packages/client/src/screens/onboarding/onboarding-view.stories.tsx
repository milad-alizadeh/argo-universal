import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { notConnectedGitHub } from './github-step-fixtures';
import { OnboardingView } from './onboarding-view';
import { onboardingArgs } from './onboarding-view.mocks';

const meta = {
  title: 'Screens/Onboarding/Set up Argo',
  component: OnboardingView,
  args: onboardingArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof OnboardingView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Onboarding: Story = {};

export const NotInstalled: Story = {
  args: { agent: { status: 'not-installed' } },
};

// What the App shows today: no GitHub sign-in or Add Project flow yet, so their buttons are disabled.
export const FirstRun: Story = {
  args: {
    github: notConnectedGitHub.github,
    onConnectGitHub: undefined,
    onAddProject: undefined,
  },
};
