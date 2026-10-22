import type { GitHubStepViewProps } from './github-step';
import { githubSteps } from './onboarding-view.mocks';

/*
 * Step 2's states, each as the complete props GitHubStepView takes. `mark` is written out rather
 * than read from `stepMarks`: GitHub is optional, so it never holds the next action, and signing in
 * is the only thing that marks the step done. Callbacks stay in the story file.
 */
type GitHubStepFixture = Omit<GitHubStepViewProps, 'onConnectGitHub'>;

export const notConnectedGitHub: GitHubStepFixture = {
  github: githubSteps.notConnected,
  mark: 'open',
};

export const loginFoundGitHub: GitHubStepFixture = {
  github: githubSteps.loginFound,
  mark: 'open',
};

export const signingInGitHub: GitHubStepFixture = {
  github: githubSteps.signingIn,
  mark: 'open',
};

export const signedInGitHub: GitHubStepFixture = {
  github: githubSteps.signedIn,
  mark: 'done',
};

export const expiredGitHub: GitHubStepFixture = {
  github: githubSteps.expired,
  mark: 'open',
};
