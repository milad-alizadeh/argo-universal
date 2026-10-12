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
  checkout: {
    branch: string;
    newWorktree: boolean;
    onNewWorktreeChange?: (enabled: boolean) => void;
    path?: string;
  };
}
