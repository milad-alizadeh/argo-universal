import { session } from '@repo/db/schema';
import { agentTitle } from '@repo/mocks/agent/title-scenarios';
import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { startSnapshotHost } from '#mocks/session-snapshot';
import { SessionTitleJob } from '../session-storage/session-storage';

const userTitle = new SessionTitleJob({
  id: 'session-1',
  title: 'Sessions list redesign',
  titleSource: 'user',
});

const agentTitleJob = new SessionTitleJob({
  id: 'session-1',
  title: agentTitle,
  titleSource: 'agent',
});

const keptTitle = { title: 'Sessions list redesign', titleSource: 'user' };

it('shows a queued user title over a later queued Agent title', async (): Promise<void> => {
  const host = startSnapshotHost();
  host.write(userTitle);
  host.write(agentTitleJob);
  await host.failWrites('session');

  const { snapshots } = host.watch('session-1');

  expect(host.writer.getSnapshot().context.queue).toHaveLength(2);
  expect(snapshots.at(-1)).toMatchObject(keptTitle);
});

it('commits a user title that a later Agent title does not replace', async (): Promise<void> => {
  const host = startSnapshotHost();
  host.write(userTitle);
  host.write(agentTitleJob);
  await waitFor(host.writer, (writer) => writer.matches('idle'));

  expect(
    host.database
      .select({ title: session.title, titleSource: session.titleSource })
      .from(session)
      .all(),
  ).toEqual([keptTitle]);
});
