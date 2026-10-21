import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { GitHubStepView } from './github-step';
import {
  expiredGitHub,
  loginFoundGitHub,
  notConnectedGitHub,
  signedInGitHub,
  signingInGitHub,
} from './github-step-fixtures';

// The AccountRow chips and captions designed for Settings › Accounts in Paper.
const meta = {
  title: 'Screens/Onboarding/GitHub step',
  component: GitHubStepView,
  argTypes: {
    github: { control: false },
    mark: { control: 'select', options: ['done', 'next', 'open'] },
  },
  args: { onConnectGitHub: fn() },
} satisfies Meta<typeof GitHubStepView>;

export default meta;

type Story = StoryObj<typeof meta>;

// Nothing saved yet: the caption says what GitHub is for and Connect starts the sign-in.
export const NotConnected: Story = { args: notConnectedGitHub };

// The GitHub CLI is already signed in, so the step offers to take that login.
export const LoginFound: Story = { args: loginFoundGitHub };

export const SigningIn: Story = { args: signingInGitHub };

// The only done state: the chip reads Signed in and the footer offers another account.
export const SignedIn: Story = { args: signedInGitHub };

export const Expired: Story = { args: expiredGitHub };
