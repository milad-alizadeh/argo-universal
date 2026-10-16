import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { OnboardingView } from './onboarding-view';
import {
  featuredTile,
  onboardingArgs,
  githubSteps,
} from './onboarding-view.mocks';

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
  args: { agent: { status: 'not-installed' }, featured: featuredTile(false) },
};

export const LoadingRegistry: Story = {
  args: { featured: { status: 'loading', rows: [] } },
};

export const RegistryError: Story = {
  args: { featured: { status: 'failed', failed: 'registry', rows: [] } },
};

// What the App shows today: no GitHub sign-in or Add Project flow yet, so their buttons are disabled.
export const FirstRun: Story = {
  args: {
    github: githubSteps.notConnected,
    onConnectGitHub: undefined,
    onAddProject: undefined,
  },
};
