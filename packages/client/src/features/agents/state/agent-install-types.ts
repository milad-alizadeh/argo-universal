import type {
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
export type InstallPhase = 'confirm' | AgentInstallOperation['status'];
export interface AgentInstallSheetProps {
  name: string;
  version: string;
  distribution: string;
  phase: Exclude<InstallPhase, 'failed' | 'cancelled'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstall: () => void;
  onCancel: () => void;
  cancelling?: boolean;
}
export interface AgentInstallPresentation {
  open: boolean;
  phase: InstallPhase;
  failure?: string;
  cancelling: boolean;
  status?: AgentInstallStatus;
  onOpenChange: (open: boolean) => void;
  onInstall: () => void;
  onCancel: () => void;
}
