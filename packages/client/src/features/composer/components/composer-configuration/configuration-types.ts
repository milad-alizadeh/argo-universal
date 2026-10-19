import type { AgentServer, SessionConfigOption } from '@repo/contracts';
import type { ReactNode } from 'react';

export interface ComposerConfigurationProps {
  // The Session's Agent, found once by whoever builds these props; undefined while it is not installed.
  agent?: AgentServer;
  // An open Session's Agent id, which names its Agent while that Agent is not installed or not loaded yet.
  agentId?: string;
  // Present only before Send; an existing Session keeps its Agent fixed.
  agentChoices?: {
    agents: AgentServer[];
    onChange: (id: string) => void;
    onAdd: () => void;
  };
  // Discovery status rendered inside the open picker, without its own surface.
  status?: ReactNode;
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
