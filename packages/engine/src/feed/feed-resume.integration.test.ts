import { feedEventId } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { identified } from '#mocks/plain-feed';

type Identified = ReturnType<typeof identified>;

interface Resume {
  after: { epoch: number; revision: number } | null;
  lastEventId?: string;
}

const quietMs = 300;

const nothingMore = (): Promise<null> =>
  new Promise((resolve) => void setTimeout(() => resolve(null), quietMs));

// A Session with one finished Turn, and what `feed.subscribe` sends for it with the ids tRPC's client resumes from.
async function settledSession(): Promise<{
  read: (input: Resume) => Promise<Identified[]>;
  epoch: number;
}> {
  const host = await startAcpEngine();

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Hello' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);

  // Everything the Server has to send, until it has nothing more.
  const read = async (input: Resume): Promise<Identified[]> => {
    const iterator = (
      await host.caller.feed.subscribe({ ...created, ...input })
    )[Symbol.asyncIterator]();

    const received: Identified[] = [];

    for (
      let next = await Promise.race([iterator.next(), nothingMore()]);
      next && !next.done;
      next = await Promise.race([iterator.next(), nothingMore()])
    )
      received.push(identified(next.value));

    void iterator.return?.();

    return received;
  };

  const snapshot = (await read({ after: null })).find(
    ({ event }) => event.type === 'snapshot',
  )?.event;

  if (snapshot?.type !== 'snapshot')
    throw new Error('The Feed sends its snapshot');

  return { read, epoch: snapshot.snapshot.epoch };
}

// From the first revision of the Session's epoch, an App that has none of its rows.
const fromStart = (epoch: number): Resume => ({
  after: { epoch, revision: 0 },
});

const rowRevisions = (events: readonly Identified[]): number[] =>
  events.flatMap(({ event }) =>
    event.type === 'row.upsert' ? [event.rev] : [],
  );

it('sends plain events, which an App from before event ids understands, when it gives no lastEventId', async () => {
  const { read, epoch } = await settledSession();
  const events = await read(fromStart(epoch));

  expect(rowRevisions(events).length).toBeGreaterThan(1);
  expect(events.every(({ id }) => id === undefined)).toBe(true);
});

it('gives each row event the id of the point it moves an App to, and the snapshot the newest', async () => {
  const { read, epoch } = await settledSession();

  const events = await read({
    ...fromStart(epoch),
    lastEventId: feedEventId({ epoch, revision: 0 }),
  });

  const rowIds = events.flatMap(({ id, event }) =>
    event.type === 'row.upsert' ? [[id, event.rev] as const] : [],
  );

  const snapshots = events.flatMap(({ id, event }) =>
    event.type === 'snapshot'
      ? [[id, event.snapshot.maxRevision] as const]
      : [],
  );

  expect(rowIds.length).toBeGreaterThan(1);
  expect(rowIds.map(([id]) => id)).toEqual(
    rowIds.map(([, revision]) => feedEventId({ epoch, revision })),
  );
  expect(snapshots.map(([id]) => id)).toEqual(
    snapshots.map(([, revision]) => feedEventId({ epoch, revision })),
  );
});

it('resumes after the last event id an App received, as its client sends on a reconnect', async () => {
  const { read, epoch } = await settledSession();
  const [first, ...later] = rowRevisions(await read(fromStart(epoch)));

  const resumed = await read({
    after: null,
    lastEventId: feedEventId({ epoch, revision: first ?? 0 }),
  });

  expect(first).toBeDefined();
  expect(rowRevisions(resumed)).toEqual(later);
});

it('resumes after the higher revision when the App held more than its event id names', async () => {
  const { read, epoch } = await settledSession();
  const newest = Math.max(...rowRevisions(await read(fromStart(epoch))));

  const resumed = await read({
    after: { epoch, revision: newest },
    lastEventId: feedEventId({ epoch, revision: 1 }),
  });

  expect(rowRevisions(resumed)).toEqual([]);
});
