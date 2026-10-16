import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { fn } from 'storybook/test';
import { type GitHubStep } from '#features/setup';
import type { OnboardingViewProps } from './onboarding-props';

export const serverName = 'Studio Mac mini';

export const agentName = 'Claude';

export const githubLogin = 'octocat';

export const githubSteps = {
  notConnected: { status: 'not-connected' },
  loginFound: { status: 'login-found', login: githubLogin },
  signingIn: { status: 'signing-in' },
  signedIn: { status: 'signed-in', login: githubLogin },
  expired: { status: 'expired', login: githubLogin },
} satisfies Record<string, GitHubStep>;

// The designed Onboarding: an Agent and GitHub done, Add a Project next, and every action wired.
export const onboardingArgs = (): OnboardingViewProps => ({
  serverName,
  agent: { status: 'done' },
  catalog: { status: 'loaded', catalog: { error: null, agents: [] } },
  featured: publishedRegistry.agents.slice(0, 1),
  installed: ['example-agent'],
  onInstallAgent: fn(),
  onRetry: fn(),
  github: githubSteps.signedIn,
  onConnectGitHub: fn(),
  onAddProject: fn(),
});

// The accessible names of GitHub's sign-in buttons.
export const githubButtons = {
  connect: 'Connect GitHub',
  signInAgain: 'Sign in to GitHub again',
  anotherAccount: 'Sign in with another account',
};
