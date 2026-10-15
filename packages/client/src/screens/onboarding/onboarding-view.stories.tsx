import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OnboardingView } from './onboarding-view';
import { onboardingArgs, githubSteps } from './onboarding-view.mocks';

const meta = {
  title: 'Screens/Onboarding/Set up Argo',
  component: OnboardingView,
  args: onboardingArgs(),
  parameters: { screenPreview: true },
} satisfies Meta<typeof OnboardingView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Onboarding: Story = {};

// Step 1 holds the primary action; Add Project waits with an outline button.
export const NoAgentFound: Story = {
  args: { agent: { status: 'not-found', checking: false } },
};

// Check again pressed: the button waits while the Server looks again.
export const CheckingAgain: Story = {
  args: { agent: { status: 'not-found', checking: true } },
};

// What the App shows today: no GitHub sign-in or Add Project flow yet, so their buttons are disabled.
export const FirstRun: Story = {
  args: {
    github: githubSteps.notConnected,
    onConnectGitHub: undefined,
    onAddProject: undefined,
  },
};
