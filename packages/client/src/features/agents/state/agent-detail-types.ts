import type { AgentRowEntry } from './agent-status';

interface AgentLink {
  label: string;
  url: string;
}

// A choice new Sessions with this Agent start with, such as the model; this device remembers it.
export interface SessionDefault {
  id: string;
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
}

// What the detail page knows about an Agent: the Server's probe, the ACP Registry's entry, or both.
export type AgentDetail = AgentRowEntry & {
  version?: string;
  // How the Server installs it, such as "npm · needs Node.js", or why this Server cannot.
  distribution?: string;
  links?: readonly AgentLink[];
  // The command that signs the Agent in, run where the Server runs.
  signInCommand?: string;
};

export interface AgentDetailViewProps {
  agent: AgentDetail;
  defaults?: readonly SessionDefault[];
  onDefaultChange?: (id: string, value: string) => void;
  onBack?: () => void;
  // Each action shows disabled until the Server can do it.
  onInstall?: () => void;
  onUpdate?: () => void;
  onRemove?: () => void;
  // Probes the Agent again, such as after signing in with the CLI.
  onCheckAgain?: () => void;
  onSignIn?: () => void;
}
