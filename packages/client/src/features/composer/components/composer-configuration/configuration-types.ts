import type { AgentServer, SessionConfigOption } from '@repo/contracts';

export interface ComposerConfigurationProps {
  // The Session's Agent, found once by whoever builds these props; undefined while it is not installed.
  agent?: AgentServer;
  // An open Session's Agent id, which names its Agent while that Agent is not installed or not loaded yet.
  agentId?: string;
  configOptions: SessionConfigOption[];
  onConfigChange: (configId: string, value: string | boolean) => void;
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
