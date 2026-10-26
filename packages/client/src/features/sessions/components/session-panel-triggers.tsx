import type { IconName } from '@repo/kit/symbols/icon-names';
import type { SessionPanel } from '../stores/session-panels';

// Each panel's name and icon, on its Workbench card and its Inspector tab.
export const sessionPanelLabels = {
  subagents: { label: 'Agents', icon: 'agent' },
  shells: { label: 'Shells', icon: 'terminal' },
  changes: { label: 'Changes', icon: 'diff' },
} as const satisfies Record<SessionPanel, { label: string; icon: IconName }>;
