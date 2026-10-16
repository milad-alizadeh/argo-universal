import type { AgentServer, ProjectInfo } from '@repo/contracts';
import type { ComposerConfigurationProps } from '../composer-configuration/composer-configuration';

export interface StartSessionInProps {
  agents: AgentServer[];
  agent: string;
  onAgentChange: (id: string) => void;
  onAddAgents: () => void;
  serverName: string;
  serverConnected: boolean;
  projects: ProjectInfo[];
  projectId: string;
  onProjectChange: (projectId: string) => void;
  checkout: ComposerConfigurationProps['checkout'];
  disabled?: boolean;
}

export interface StartSessionLayout {
  props: StartSessionInProps;
  wide: boolean;
}
