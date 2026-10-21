import { type AgentStep, type GitHubStep, stepMarks } from '#features/setup';
import type { GitHubStepViewProps } from './github-step';
import { githubSteps } from './onboarding-view.mocks';

// Step 2's states, each with the checklist mark that step carries. Callbacks stay in the story file.
type GitHubStepFixture = Omit<GitHubStepViewProps, 'onConnectGitHub'>;

// Step 1 is behind the reader in every one of these, so GitHub is the step they are looking at.
const agentDone: AgentStep = { status: 'done' };

const githubStep = (github: GitHubStep): GitHubStepFixture => ({
  github,
  mark: stepMarks(agentDone, github).github,
});

export const notConnectedGitHub = githubStep(githubSteps.notConnected);

export const loginFoundGitHub = githubStep(githubSteps.loginFound);

export const signingInGitHub = githubStep(githubSteps.signingIn);

export const signedInGitHub = githubStep(githubSteps.signedIn);

export const expiredGitHub = githubStep(githubSteps.expired);
