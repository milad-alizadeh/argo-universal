import type { Shell } from '@repo/contracts';
import {
  ShellPanel,
  shellsRunning,
  WorkbenchMoreTasks,
  WorkbenchTasks,
} from '#features/sessions';
import type { SessionInspectorContent } from '../session-inspector-content';
import type { SessionSection } from './session-section';
import { shellsFacts } from './shells-facts';

const shellsOf = ({ shells }: SessionInspectorContent): Shell[] =>
  shells?.shells ?? [];

// Picking a task opens its output; the Inspector's tab shows it once the Session has selected it.
export const shellsSection: SessionSection = {
  ...shellsFacts,
  card: (content, tab) => ({
    summary: (
      <WorkbenchTasks
        shells={shellsOf(content)}
        now={content.shells?.now}
        onOpen={(shell) => {
          content.shells?.onSelect?.(shell);
          tab.open();
        }}
      />
    ),
    footer: <WorkbenchMoreTasks shells={shellsOf(content)} onOpen={tab.open} />,
  }),
  tab: (content) => ({
    count: shellsOf(content).length,
    countTone: shellsRunning(shellsOf(content)) ? 'success' : 'muted',
    body: content.shells && <ShellPanel {...content.shells} listScrolls />,
  }),
};
