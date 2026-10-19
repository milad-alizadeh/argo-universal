import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { fn } from 'storybook/test';
import type { AgentRows } from '#features/agents';
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

const [example] = publishedRegistry.agents;

if (!example) throw new Error('Registry fixture needs an Agent');

// Get started's one featured Agent card, installed or not.
export const featuredAgent = (installed: boolean): AgentRows => ({
  status: 'loaded',
  rows: [
    {
      id: example.id,
      name: example.name,
      version: example.version,
      description: example.description,
      icon: example.icon,
      installed,
      unavailable: false,
    },
  ],
});

// The designed Onboarding: an Agent and GitHub done, Add a Project next, and every action wired.
export const onboardingArgs = (): OnboardingViewProps => ({
  serverName,
  agent: { status: 'done' },
  featured: featuredAgent(true),
  onInstallAgent: fn(),
  onRemoveAgent: fn(),
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
