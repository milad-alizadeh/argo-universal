import { existsSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { pauseArchiveWrite, promptedArchiveSession } from '#mocks/archive';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

type Created = Awaited<ReturnType<typeof promptedArchiveSession>>;

const continuePrompt = [{ type: 'text' as const, text: 'Continue after Undo' }];

async function verifyRemoval(host: Host, created: Created): Promise<void> {
  expect(existsSync(created.path)).toBe(true);
  await expect
    .poll(() => existsSync(created.path), { timeout: 7000 })
    .toBe(false);
  await expect(
    host.caller.session.unarchive({ sessionId: created.sessionId }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
}

async function verifyUndo(host: Host, created: Created): Promise<void> {
  expect(existsSync(created.path)).toBe(true);
  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toMatchObject([{ sessionId: created.sessionId }]);
  await expect(
    host.caller.session.prompt({
      sessionId: created.sessionId,
      prompt: continuePrompt,
    }),
  ).resolves.toHaveProperty('messageId');
}

it.each([
  {
    operation: 'archive' as const,
    predicate: 'IS NOT NULL' as const,
    verify: verifyRemoval,
  },
  {
    operation: 'unarchive' as const,
    predicate: 'IS NULL' as const,
    verify: verifyUndo,
  },
])(
  'keeps $operation owned through a Writer retry and acknowledges its eventual commit',
  async ({ operation, predicate, verify }) => {
    const host = await startAcpEngine({ steps: [] });
    const created = await promptedArchiveSession(host);

    if (operation === 'unarchive')
      await host.caller.session.archive({ sessionId: created.sessionId });

    const rejected = pauseArchiveWrite(host.database, predicate);
    let settled = false;

    const result = host.caller.session[operation]({
      sessionId: created.sessionId,
    })
      .then(
        () => true,
        () => false,
      )
      .finally(() => {
        settled = true;
      });

    await rejected;
    await setTimeout(0);
    const pendingDuringRetry = !settled;
    host.database.$client.exec('DROP TRIGGER pause_archive');
    expect(await result).toBe(true);
    expect(pendingDuringRetry).toBe(true);

    await verify(host, created);
  },
  15000,
);
