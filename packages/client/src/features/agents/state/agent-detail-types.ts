import type { AgentInstallPresentation } from './agent-install-types';
import type { AgentManagement } from './agent-management-types';
import type { AgentRowEntry } from './agent-status';
import type { ToolInstallPresentation } from './missing-tool';

interface AgentLink {
  label: string;
  url: string;
}

// What the detail page knows about an Agent: the Server's probe, the ACP Registry's entry, or both.
export type AgentDetail = AgentRowEntry & {
  // The Adapter's version for an installed Agent, the catalog's release for one not installed.
  version?: string;
  // What the Agent reported over ACP, only when it differs from the Adapter's.
  agentVersion?: string;
  availableVersion?: string;
  // How the Server installs it, such as "npm · needs Node.js", or why this Server cannot.
  distribution?: string;
  // Where the Resolver found an installed Agent: in Argo's folder or elsewhere on this Mac.
  source?: 'Found on this Mac' | 'Installed by Argo';
  links?: readonly AgentLink[];
};

export interface AgentDetailViewProps {
  agent: AgentDetail;
  onBack?: () => void;
  // Each action shows disabled until the Server can do it.
  onInstall?: () => void;
  installation?: AgentInstallPresentation;
  // Installing the tool a Needs Node.js or Needs uv Agent is missing.
  tool?: ToolInstallPresentation;
  onUpdate?: () => void;
  onRemove?: () => void;
  management?: AgentManagement;
  // Checks the Agent's Readiness again, such as after signing in with the CLI.
  onRecheck?: () => void;
  onSignIn?: () => void;
  // Installs the same release again when its files are missing.
  onRepair?: () => void;
}
