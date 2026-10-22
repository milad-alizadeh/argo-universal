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

// Step 2 of Set up Argo, in the AccountRow chips and captions designed for Settings › Accounts in Paper.
const meta = {
  title: 'Screens/Onboarding/GitHub step',
  component: GitHubStepView,
  argTypes: {
    github: { control: false },
    // The checklist, not the reader, decides a step's mark, so each state's fixture carries it.
    mark: { control: false },
  },
  args: { onConnectGitHub: fn() },
} satisfies Meta<typeof GitHubStepView>;

export default meta;

type Story = StoryObj<typeof meta>;

// Nothing saved yet: the caption says what GitHub is for and Connect starts the sign-in.
export const NotConnected: Story = { args: notConnectedGitHub };

// The GitHub CLI is already signed in, so the step offers to take that login.
export const LoginFound: Story = { args: loginFoundGitHub };

// The code is on GitHub and the App is waiting: a muted chip, and nothing to press.
export const SigningIn: Story = { args: signingInGitHub };

// The only done state: the chip reads Signed in and the footer offers another account.
export const SignedIn: Story = { args: signedInGitHub };

// GitHub rejected the saved login: the caption names it and the button offers to sign in again.
export const Expired: Story = { args: expiredGitHub };
