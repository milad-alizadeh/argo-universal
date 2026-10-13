import type { AgentStep, GitHubStep } from '../../state/onboarding';

export interface OnboardingViewProps {
  // The Server Device's name, once the Server has said it.
  serverName?: string;
  agent: AgentStep;
  github: GitHubStep;
  onChangeAgent: () => void;
  onCheckAgentAgain: () => void;
  // Unset until the App can sign in to GitHub, so its buttons show disabled.
  onConnectGitHub?: () => void;
  // Unset until the App can add a Project, so its button shows disabled.
  onAddProject?: () => void;
}
