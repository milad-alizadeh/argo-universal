import type { AgentLoginSnapshot } from '@repo/contracts';
export type AgentLoginSheetProps = {
  agentName: string;
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
