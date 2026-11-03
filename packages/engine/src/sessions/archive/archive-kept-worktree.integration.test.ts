import { existsSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { project } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { startEngineTestHost } from '#mocks/engine';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const projectIdOf = (host: Host): string =>
  host.database.select().from(project).get()?.id ?? '';

const setArchiveCleanup = async (
  host: Host,
  deleteWorktreeOnArchive: boolean,
): Promise<void> => {
  await host.caller.project.update({
    projectId: projectIdOf(host),
    deleteWorktreeOnArchive,
  });
};

const restart = async (host: Host): Promise<void> => {
  const restarted = await startEngineTestHost({ home: host.home });

  await restarted.stop();
};

it('keeps the worktree past the removal deadline when the Project keeps them', async () => {
  const host = await startAcpEngine({ steps: [] });
  await setArchiveCleanup(host, false);
  const created = await promptedArchiveSession(host);

  await host.caller.session.archive({ sessionId: created.sessionId });
  await setTimeout(5_500);

  expect(existsSync(created.path)).toBe(true);
}, 15000);

it('holds to the setting in force at archive, across a later change and restarts', async () => {
  const host = await startAcpEngine({ steps: [] });
  await setArchiveCleanup(host, false);
  const created = await promptedArchiveSession(host);

  await host.caller.session.archive({ sessionId: created.sessionId });
  await setArchiveCleanup(host, true);
  await host.stop();
  await restart(host);

  expect(existsSync(created.path)).toBe(true);
}, 15000);

it('follows the setting at the next archive once one is undone', async () => {
  const host = await startAcpEngine({ steps: [] });
  await setArchiveCleanup(host, false);
  const created = await promptedArchiveSession(host);

  await host.caller.session.archive({ sessionId: created.sessionId });
  await host.caller.session.unarchive({ sessionId: created.sessionId });
  await setArchiveCleanup(host, true);
  await host.caller.session.archive({ sessionId: created.sessionId });
  await host.stop();
  await restart(host);

  expect(existsSync(created.path)).toBe(false);
}, 15000);
