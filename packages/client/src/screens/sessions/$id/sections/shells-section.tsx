import type { Shell } from '@repo/contracts';
import {
  ShellPanel,
  shellsRunning,
  WorkbenchCountSummary,
} from '#features/sessions';
import type { SessionInspectorContent } from '../session-inspector-content';
import type { SessionSection } from './session-section';
import { shellsFacts } from './shells-facts';

const shellsOf = ({ shells }: SessionInspectorContent): Shell[] =>
  shells?.shells ?? [];

export const shellsSection: SessionSection = {
  ...shellsFacts,
  card: (content, tab) => ({
    summary: (
      <WorkbenchCountSummary
        count={shellsFacts.count(content)}
        icon={shellsFacts.icon}
        noun="shell"
      />
    ),
    onOpen: tab.open,
  }),
  tab: (content) => ({
    count: shellsOf(content).length,
    countTone: shellsRunning(shellsOf(content)) ? 'success' : 'muted',
    body: content.shells && <ShellPanel {...content.shells} listScrolls />,
  }),
};
