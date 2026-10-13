import type { AgentInstallStatus } from '@repo/contracts';
export type InstallAction = 'Install' | 'Update';
// How an installation this page saw ended; the key tells a new outcome from a repeated one.
export type InstallNotice =
  | { key: string; result: 'installed'; version: string }
  | { key: string; result: 'failed'; failure: string };
// The action it ran as: finishing an update refreshes the page's offer back to Install.
export type ActionNotice = InstallNotice & { action: InstallAction };
export interface AgentInstallPresentation {
  action: InstallAction;
  version: string;
  // The connected Server's name: where the Agent installs.
  server?: string;
  // The confirmation Alert is open.
  confirming: boolean;
  // A request or Server operation is running; the action shows its progress.
  installing: boolean;
  notice?: ActionNotice;
  status?: AgentInstallStatus;
  onConfirmingChange: (open: boolean) => void;
  onInstall: () => void;
}
