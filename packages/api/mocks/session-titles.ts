import type {
  SessionInfo,
  SessionRenameInput,
  SessionSnapshot,
} from '@repo/contracts';
import { recordedFeedMocks } from './feed';
import { agentsList, sessionRows } from './session-list';
import recordedTitle from './session-title.json';

const titleRows = {
  prompt: {
    ...sessionRows.idle,
    titleSource: 'prompt',
    title: 'Investigate the Session list reconnect bug',
  },
  agent: {
    ...sessionRows.idle,
    titleSource: 'agent',
    title: recordedTitle.title,
  },
  user: {
    ...sessionRows.idle,
    titleSource: 'user',
    title: 'My reconnect investigation',
  },
  longTitle: sessionRows.longTitle,
} satisfies Record<string, SessionInfo>;

// Both Agents share the title states; only the Agent's own title comes from its recording.
export const sessionTitleMocks = agentsList.flatMap(({ agent }, index) => {
  const feed = recordedFeedMocks.find(
    (mock) => mock.agent === `agent-${index + 1}`,
  );
  if (!feed) throw new Error(`Missing Feed mock for ${agent}`);
  return Object.entries(titleRows).map(([name, row]) => {
    const session = { ...row, agent, sessionId: `${agent}-title-${name}` };
    return {
      name,
      session,
      snapshot: {
        ...feed.snapshot,
        title: session.title,
        titleSource: session.titleSource,
      } satisfies SessionSnapshot,
      renameInput: {
        sessionId: session.sessionId,
        title: 'My reconnect investigation',
      } satisfies SessionRenameInput,
    };
  });
});
