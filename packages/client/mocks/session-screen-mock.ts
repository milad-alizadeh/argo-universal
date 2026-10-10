import type { SessionSnapshot } from '@repo/contracts';
import { type FeedMock, newSessionCatalogs } from '@repo/mocks/app';
import { recordedFeedMock } from '../src/lib/product/feed-message.mocks';
import { createFeedMocks } from './feed-mock';
import type { Fixtures } from './trpc-mock-link';

const catalogAgent = ((): (typeof newSessionCatalogs.bothAvailable)[number] => {
  const [agent] = newSessionCatalogs.bothAvailable;
  if (!agent) throw new Error('No Agent in the catalog mock');
  return agent;
})();

// The tail page holds every row, so the subscription sends only this snapshot.
function withWholeTail(mock: FeedMock): FeedMock {
  const fullSnapshot: SessionSnapshot = {
    ...mock.snapshot,
    // The catalog's Agent, so the Composer shows its name and options.
    agent: catalogAgent.agent,
    configOptions: catalogAgent.configOptions,
  };
  return {
    ...mock,
    snapshot: fullSnapshot,
    stream: [{ type: 'snapshot', snapshot: fullSnapshot }],
  };
}

const idleFeed = withWholeTail(recordedFeedMock('agent-2', 'markdown-answer'));

// An idle Session screen, for Composer stories that send through it.
export const idleSessionMocks: Fixtures = {
  ...createFeedMocks(idleFeed),
  'agents.list': () => newSessionCatalogs.bothAvailable,
  'session.prompt': () => ({ messageId: 'message-sent' }),
  'session.cancel': () => ({}),
  'session.setConfigOption': () => ({ configOptions: [] }),
};
