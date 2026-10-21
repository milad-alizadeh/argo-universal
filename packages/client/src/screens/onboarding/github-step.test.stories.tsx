import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { type GitHubStep } from '#features/setup';
import { GitHubStepView } from './github-step';
import {
  githubButtons,
  githubLogin,
  githubSteps,
} from './onboarding-view.mocks';

const meta = {
  title: 'Tests/Screens/Onboarding/GitHub step',
  component: GitHubStepView,
  args: {
    github: githubSteps.notConnected,
    mark: 'open',
    onConnectGitHub: fn(),
  },
} satisfies Meta<typeof GitHubStepView>;

export default meta;

type Story = StoryObj<typeof meta>;

const loginPattern = new RegExp(githubLogin);

const chips = ['Login found', 'Signing in…', 'Signed in', 'Sign-in expired'];

async function expectOnly(
  names: readonly string[],
  expected: string | undefined,
  find: (name: string) => HTMLElement[],
): Promise<void> {
  for (const name of names)
    await expect(find(name)).toHaveLength(name === expected ? 1 : 0);
}

// Each state shows only its AccountRow chip, the login where it knows one, and the one button that starts a sign-in where it has one.
const githubState = (
  github: GitHubStep,
  expected: { chip?: string; login?: boolean; button?: string },
): Story => ({
  args: { github },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.queryAllByText(loginPattern)).toHaveLength(
      expected.login ? 1 : 0,
    );
    await expectOnly(chips, expected.chip, (chip) =>
      canvas.queryAllByText(chip),
    );
    await expectOnly(Object.values(githubButtons), expected.button, (name) =>
      canvas.queryAllByRole('button', { name }),
    );

    if (expected.button === undefined) return;
    await userEvent.click(
      canvas.getByRole('button', { name: expected.button }),
    );
    await expect(args.onConnectGitHub).toHaveBeenCalledOnce();
  },
});

export const NotConnected = githubState(githubSteps.notConnected, {
  button: githubButtons.connect,
});

export const LoginFound = githubState(githubSteps.loginFound, {
  chip: 'Login found',
  login: true,
  button: githubButtons.connect,
});

export const SigningIn = githubState(githubSteps.signingIn, {
  chip: 'Signing in…',
});

export const SignedIn = githubState(githubSteps.signedIn, {
  chip: 'Signed in',
  login: true,
  button: githubButtons.anotherAccount,
});

export const SignInExpired = githubState(githubSteps.expired, {
  chip: 'Sign-in expired',
  login: true,
  button: githubButtons.signInAgain,
});
