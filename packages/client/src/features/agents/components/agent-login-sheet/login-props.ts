import type { AgentLoginSnapshot } from '@repo/contracts';
import type { LoginTerminalProps } from '../agent-login-terminal/terminal-props';
export type AgentLoginSheetProps = {
  agentName: string;
  terminal?: Omit<LoginTerminalProps, 'enabled'>;
  snapshot?: AgentLoginSnapshot;
  disconnected?: boolean;
  busy?: boolean;
  failure?: string;
  onChoose: (methodId: string) => void;
  onAnswer: (requestId: string, action: 'accept' | 'cancel') => void;
  onOpenBrowser: (url: string) => void;
  onCancel: () => void;
  onRetry: () => void;
  onClose: () => void;
};
