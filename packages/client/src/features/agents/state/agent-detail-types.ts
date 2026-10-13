import type { AgentInstallPresentation } from './agent-install-types';
import type { AgentManagement } from './agent-management-types';
import type { AgentRowEntry } from './agent-status';

interface AgentLink {
  label: string;
  url: string;
}

// What the detail page knows about an Agent: the Server's probe, the ACP Registry's entry, or both.
export type AgentDetail = AgentRowEntry & {
  version?: string;
  availableVersion?: string;
  // How the Server installs it, such as "npm · needs Node.js", or why this Server cannot.
  distribution?: string;
  links?: readonly AgentLink[];
};

export interface AgentDetailViewProps {
  agent: AgentDetail;
  onBack?: () => void;
  // Each action shows disabled until the Server can do it.
  onInstall?: () => void;
  installation?: AgentInstallPresentation;
  onUpdate?: () => void;
  onRemove?: () => void;
  management?: AgentManagement;
  // Checks the Agent's Readiness again, such as after signing in with the CLI.
  onRecheck?: () => void;
  onSignIn?: () => void;
  // Installs the same release again when its files are missing.
  onRepair?: () => void;
}
