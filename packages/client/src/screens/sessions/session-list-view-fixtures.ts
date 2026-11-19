import { sessionRows } from '@repo/mocks/app';
import type { SessionListViewProps } from './session-list-view';
import { loadedSessionListView } from './session-list-view.mocks';

const issueItem = {
  key: 'issue-tracker:412',
  pluginId: 'issue-tracker',
  pluginName: 'Issue tracker',
  item: {
    icon: { sf: 'ticket', material: 'confirmation_number' },
    text: `#${412}`,
    tone: 'info',
  },
} as const;

const attachedSession = loadedSessionListView.sessions.find(
  ({ title }) => title === sessionRows.idle.title,
);

export const Sessions = {
  ...loadedSessionListView,
  plugins: {
    rows: new Map(
      attachedSession
        ? [[attachedSession.sessionId, { items: [issueItem], more: [] }]]
        : [],
    ),
  },
} satisfies Partial<SessionListViewProps>;
