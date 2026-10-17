import type { FeedSubscribeOutput, SessionSnapshot } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';

const snapshotTitled = (
  event: FeedSubscribeOutput,
  title: string,
): SessionSnapshot | undefined =>
  event.type === 'snapshot' && event.snapshot.title === title
    ? event.snapshot
    : undefined;

// The open stream's next snapshot under `title`.
async function nextTitled(
  events: AsyncIterator<FeedSubscribeOutput>,
  title: string,
): Promise<SessionSnapshot> {
  const next = await events.next();

  if (next.done) throw new Error('The Feed closed before the snapshot');

  return snapshotTitled(next.value, title) ?? nextTitled(events, title);
}

const renamed = 'Renamed Session';

it('republishes an open Session page snapshot under its new title', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await promptedArchiveSession(host, { type: 'main' });

  const events = (await host.caller.feed.subscribe({ sessionId, after: null }))[
    Symbol.asyncIterator
  ]();

  await nextTitled(events, 'Keep this Session');
  await host.caller.session.rename({ sessionId, title: renamed });
  expect((await nextTitled(events, renamed)).title).toBe(renamed);
  await events.return?.();
  await host.stop();
});
