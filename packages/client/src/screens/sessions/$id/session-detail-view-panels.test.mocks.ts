import { fn } from 'storybook/test';
import { sessionShells } from '../../../features/sessions/components/shell-list/shell-list.mocks';
import { coverageCard } from './sections/plugin-card.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { subagentsSession } from './session-detail-view-subagents.mocks';

// Changed files make Changes a real section beside the Session's Agents.
export const panelsSession = {
  ...subagentsSession,
  header: {
    ...subagentsSession.header,
    changes: {
      summary: { files: 4, additions: 65, deletions: 64 },
      open: false,
      onOpenChange: fn(),
    },
  },
} satisfies SessionDetailViewProps;

export const workbenchSheetSession = {
  ...panelsSession,
  shells: { shells: sessionShells, onStop: fn() },
  pluginCards: [coverageCard],
} satisfies SessionDetailViewProps;
