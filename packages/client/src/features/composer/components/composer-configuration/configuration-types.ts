import type { AgentInfo, SessionConfigOption } from '@repo/contracts';

export interface ComposerConfigurationProps {
  agents: AgentInfo[];
  agent: string;
  configOptions: SessionConfigOption[];
  onConfigChange: (configId: string, value: string | boolean) => void;
  onAgentChange?: (agent: string) => void;
  onAgentSetup?: (agent: string) => void;
  onAgentRetry?: () => void;
  turnRunning?: boolean;
  // True while New Session's Session opens and takes this device's last choices.
  opening?: boolean;
  checkout: {
    branch: string;
    newWorktree: boolean;
    onNewWorktreeChange?: (enabled: boolean) => void;
    path?: string;
  };
}

// A page of choices, such as the models; a phone's sheet fits it.
export interface ConfigurationChoicesProps {
  configuration: ComposerConfigurationProps;
  onSelect: () => void;
}
