import type { Shell } from '@repo/contracts';
import type { ReactNode } from 'react';
import {
  ShellPanel,
  shellsRunning,
  WorkbenchMoreTasks,
  WorkbenchTasks,
} from '#features/sessions';
import type { SessionInspectorContent } from '../session-inspector-content';
import type { SectionTabHandle, SessionSection } from './session-section';
import { shellsFacts } from './shells-facts';

const shellsOf = ({ shells }: SessionInspectorContent): Shell[] =>
  shells?.shells ?? [];

// A row opens that task's output.
const shellsSummary = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => (
  <WorkbenchTasks
    shells={shellsOf(content)}
    now={content.shells?.now}
    onOpen={(shell) => {
      content.shells?.onSelect?.(shell);
      tab.open();
    }}
  />
);

// The footer opens the list, so it first drops any open task.
const shellsFooter = (
  content: SessionInspectorContent,
  tab: SectionTabHandle,
): ReactNode => (
  <WorkbenchMoreTasks
    shells={shellsOf(content)}
    onOpen={() => {
      content.shells?.onDeselect?.();
      tab.open();
    }}
  />
);

export const shellsSection: SessionSection = {
  ...shellsFacts,
  card: (content, tab) => ({
    summary: shellsSummary(content, tab),
    footer: shellsFooter(content, tab),
  }),
  tab: (content) => ({
    count: shellsOf(content).length,
    countTone: shellsRunning(shellsOf(content)) ? 'success' : 'muted',
    body: content.shells && <ShellPanel {...content.shells} listScrolls />,
  }),
};
