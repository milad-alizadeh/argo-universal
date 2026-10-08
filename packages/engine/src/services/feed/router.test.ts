import type {
  AgentMessage,
  FeedPageOutput,
  FeedSubscribeOutput,
} from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { unreachableServices } from '#mocks/services';
import { appRouter } from '../../engine/router';
import { createCallerFactory } from '../../engine/trpc';
import type { Services } from '../services';

const firstMessageRowId = 'message-1#0';

const createCaller = createCallerFactory(appRouter);

const row: AgentMessage = {
  id: firstMessageRowId,
  sessionId: 'session-1',
  position: 0,
  revision: 1,
  turnId: 'turn-1',
  state: 'settled',
  sessionUpdate: 'agent_message',
  messageId: 'message-1',
  content: [{ type: 'text', text: 'Hello' }],
};
const page: FeedPageOutput = {
  epoch: 0,
  maxRevision: 1,
  rows: [row],
  hasOlder: false,
  startCursor: 0,
  staleCursor: false,
};

const servicesWith = (feed: Partial<Services['feed']>): Services =>
  unreachableServices({ feed });

const collect = async (
  updates: AsyncIterable<FeedSubscribeOutput>,
): Promise<FeedSubscribeOutput[]> => {
  const received: FeedSubscribeOutput[] = [];
  for await (const update of updates) received.push(update);
  return received;
};

describe('feed router', (): void => {
  it('answers feed.page from the feed service, with the default limit', async (): Promise<void> => {
    const inputs: unknown[] = [];
    const caller = createCaller({
      services: servicesWith({
        page: (input): FeedPageOutput => {
          inputs.push(input);
          return page;
        },
      }),
    });

    expect(
      await caller.feed.page({ sessionId: 'session-1', direction: 'tail' }),
    ).toEqual(page);
    expect(inputs).toEqual([
      { sessionId: 'session-1', direction: 'tail', limit: 40 },
    ]);
  });

  it('rejects a feed.page limit above 200', async (): Promise<void> => {
    const caller = createCaller({ services: servicesWith({}) });

    await expect(
      caller.feed.page({
        sessionId: 'session-1',
        direction: 'tail',
        limit: 201,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects a row that breaks the contract', async (): Promise<void> => {
    const services = servicesWith({});
    Reflect.set(services.feed, 'row', () => ({
      ...row,
      sessionUpdate: 'agent_monologue',
    }));
    const caller = createCaller({ services });

    await expect(
      caller.feed.row({ sessionId: 'session-1', id: firstMessageRowId }),
    ).rejects.toThrow('Output validation failed');
  });

  it('streams feed.subscribe updates from the feed service', async (): Promise<void> => {
    const updates: FeedSubscribeOutput[] = [
      { type: 'row.upsert', rev: 1, row },
      {
        type: 'row.append',
        rev: 2,
        id: firstMessageRowId,
        field: 'content.0.text',
        off: 5,
        text: '!',
      },
    ];
    const caller = createCaller({
      services: servicesWith({
        subscribe: async function* (): AsyncGenerator<
          FeedSubscribeOutput,
          void,
          Parameters<typeof structuredClone>[0]
        > {
          yield* updates;
        },
      }),
    });

    expect(
      await collect(
        await caller.feed.subscribe({ sessionId: 'session-1', after: null }),
      ),
    ).toEqual(updates);
  });

  it('rejects a feed.subscribe update that breaks the contract', async (): Promise<void> => {
    const caller = createCaller({
      services: servicesWith({
        subscribe: async function* (): AsyncGenerator<
          FeedSubscribeOutput,
          void,
          Parameters<typeof structuredClone>[0]
        > {
          yield { type: 'row.upsert', rev: 1, row: { ...row, position: -0.5 } };
        },
      }),
    });

    await expect(
      collect(
        await caller.feed.subscribe({ sessionId: 'session-1', after: null }),
      ),
    ).rejects.toThrow();
  });
});
