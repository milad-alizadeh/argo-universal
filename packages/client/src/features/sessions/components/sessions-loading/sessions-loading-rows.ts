import type { SessionInfo } from '@repo/contracts';

const projectId = 'loading-project';

const placeholderSession = {
  projectId,
  agent: 'loading-agent',
  parentSessionId: null,
  cwd: '',
  status: 'idle',
  titleSource: 'agent',
  activityAt: 0,
  checkout: { type: 'main', path: '', branch: 'main' },
  plan: null,
  subagents: { running: 0, total: 0 },
  shells: { running: 0, total: 0 },
  archivedAt: null,
  pullRequest: null,
  createdAt: 0,
  updatedAt: 0,
} satisfies Omit<SessionInfo, 'sessionId' | 'title' | 'activity'>;

export interface PlaceholderRow {
  session: SessionInfo;
  age: string;
}

/*
 * Placeholder text never shows: the Skeleton draws a bar as wide as each line the real row lays out, so
 * titles and activities of differing lengths read as a list.
 */
export const placeholderRows: readonly PlaceholderRow[] = [
  {
    session: {
      ...placeholderSession,
      sessionId: 'loading-1',
      title: 'Fix the sidebar scroll',
      activity: 'Worked for 4m',
    },
    age: '2h',
  },
  {
    session: {
      ...placeholderSession,
      sessionId: 'loading-2',
      title: 'Add a sign-in step',
      activity: 'Replied to 3 comments',
    },
    age: '1d',
  },
  {
    session: {
      ...placeholderSession,
      sessionId: 'loading-3',
      title: 'Draw the loading rows again',
      activity: 'Ran the tests',
    },
    age: '3d',
  },
  {
    session: {
      ...placeholderSession,
      sessionId: 'loading-4',
      title: 'Rename the Drawer',
      activity: 'The change is ready to review.',
    },
    age: '1w',
  },
];

export const placeholderProjectName = 'Example Project';
