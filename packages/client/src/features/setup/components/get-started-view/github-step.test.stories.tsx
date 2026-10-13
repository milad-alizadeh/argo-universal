import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import type { GitHubStep } from '../../state/get-started';
import {
  githubButtons,
  githubLogin,
  githubSteps,
} from './get-started-view.mocks';
import { GitHubStepView } from './github-step';

const meta = {
  title: 'Tests/Setup/GitHubStep',
  component: GitHubStepView,
  args: {
    github: githubSteps.notConnected,
    mark: 'open',
    onConnectGitHub: fn(),
  },
} satisfies Meta<typeof GitHubStepView>;
export default meta;
type Story = StoryObj<typeof meta>;

const chips = ['Login found', 'Signing in…', 'Signed in', 'Sign-in expired'];

async function expectOnly(
  names: readonly string[],
  expected: string | undefined,
  find: (name: string) => HTMLElement[],
): Promise<void> {
  for (const name of names)
    await expect(find(name)).toHaveLength(name === expected ? 1 : 0);
}

// Each state shows only its AccountRow chip, its caption, and the one button that starts a sign-in where it has one.
const githubState = (
  github: GitHubStep,
  expected: { chip?: string; caption: string; button?: string },
): Story => ({
  args: { github },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText(expected.caption)).toBeVisible();
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
  caption: 'Optional. Clone repositories, open pull requests, read Issues.',
  button: githubButtons.connect,
});

export const LoginFound = githubState(githubSteps.loginFound, {
  chip: 'Login found',
  caption: `The GitHub CLI is signed in as ${githubLogin}.`,
  button: githubButtons.connect,
});

export const SigningIn = githubState(githubSteps.signingIn, {
  chip: 'Signing in…',
  caption: 'Enter the code on GitHub to finish.',
});

export const SignedIn = githubState(githubSteps.signedIn, {
  chip: 'Signed in',
  caption: `Connected as ${githubLogin}`,
  button: githubButtons.anotherAccount,
});

export const SignInExpired = githubState(githubSteps.expired, {
  chip: 'Sign-in expired',
  caption: `GitHub rejected the saved login for ${githubLogin}.`,
  button: githubButtons.signInAgain,
});
