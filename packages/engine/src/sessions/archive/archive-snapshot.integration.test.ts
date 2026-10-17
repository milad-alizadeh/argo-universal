import type { FeedSubscribeOutput, SessionSnapshot } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { promptedArchiveSession } from '#mocks/archive';
import { startEngineTestHost } from '#mocks/engine';

const mainCheckout = { type: 'main' as const };

const snapshotWhen = (
  event: FeedSubscribeOutput,
  archived: boolean,
): SessionSnapshot | undefined =>
  event.type === 'snapshot' && (event.snapshot.archivedAt !== null) === archived
    ? event.snapshot
    : undefined;

// The open stream's next snapshot that shows the Session archived, or not.
async function nextSnapshot(
  events: AsyncIterator<FeedSubscribeOutput>,
  archived: boolean,
): Promise<SessionSnapshot> {
  const next = await events.next();

  if (next.done) throw new Error('The Feed closed before the snapshot');

  return snapshotWhen(next.value, archived) ?? nextSnapshot(events, archived);
}

it('republishes an open Session page snapshot when its Session is archived and unarchived', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host, mainCheckout);

  const events = (await host.caller.feed.subscribe({ sessionId, after: null }))[
    Symbol.asyncIterator
  ]();

  expect(await nextSnapshot(events, false)).toMatchObject({ archivedAt: null });
  await host.caller.session.archive({ sessionId });
  expect((await nextSnapshot(events, true)).archivedAt).toEqual(
    expect.any(Number),
  );
  await host.caller.session.unarchive({ sessionId });
  expect(await nextSnapshot(events, false)).toMatchObject({ archivedAt: null });
  await events.return?.();
});

it('streams a stored archived Session read-only after an Engine restart', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host, mainCheckout);
  await host.caller.session.close({ sessionId });
  await host.caller.session.archive({ sessionId });
  await host.stop();
  const restarted = await startEngineTestHost({ home: host.home });

  const snapshot = await waitForAcpSnapshot(restarted, sessionId, () => true);

  expect(snapshot).toMatchObject({
    archivedAt: expect.any(Number),
    title: 'Keep this Session',
    state: 'idle',
  });
  expect(snapshot.maxRevision).toBeGreaterThan(0);
  await expect(
    restarted.caller.session.prompt({
      sessionId,
      prompt: [{ type: 'text', text: 'Keep going' }],
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  await restarted.stop();
});
