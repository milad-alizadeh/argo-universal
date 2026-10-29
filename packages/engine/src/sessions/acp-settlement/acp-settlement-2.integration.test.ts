import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { recoverAfterRestart } from '../recovery';

it('commits the Turn ending with its Feed marker and preserves it through restart', async () => {
  const done = Promise.withResolvers<void>();
  const entered = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          steps: [{ type: 'gate', waitFor: done.promise, entered }],
          result: { stopReason: 'refusal' },
        },
      ],
    },
  });

  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Work' }],
  });
  await entered.promise;
  await expect.poll(() => host.databaseWriter.getSnapshot().value).toBe('idle');

  const directory = mkdtempSync(join(tmpdir(), 'argo-turn-ending-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const snapshotPath = join(directory, 'snapshot.db');

  const readEnding = `
    SELECT t.status, t.stop_reason, t.ended_at,
      json_extract(f.payload, '$._meta.argo.turnEnd') AS marker
    FROM turn t LEFT JOIN feed_row f ON f.id=t.id || ':end' AND f.session_id=t.session_id
    WHERE t.session_id=?`;

  const endings: unknown[] = [];
  let copied = false;

  const copySnapshot = (): void => {
    if (copied) return;
    host.database.$client.prepare('VACUUM INTO ?').run(snapshotPath);
    copied = true;
  };

  const observer = host.databaseWriter.on('writer.committed', () => {
    const ending = host.database.$client
      .prepare(readEnding)
      .get(created.sessionId);

    endings.push(ending);

    if (ending?.marker) copySnapshot();
  });

  onTestFinished(() => observer.unsubscribe());
  done.resolve();
  await waitForAcpSessionIdle(host, created.sessionId);
  await expect.poll(() => host.databaseWriter.getSnapshot().value).toBe('idle');
  observer.unsubscribe();

  expect(copied).toBe(true);
  const restarted = openDatabase(snapshotPath);

  try {
    const before = restarted.$client.prepare(readEnding).get(created.sessionId);
    recoverAfterRestart(restarted);
    expect(
      restarted.$client.prepare(readEnding).get(created.sessionId),
    ).toEqual(before);

    for (const ending of endings)
      expect(ending).toMatchObject({
        status: 'ended',
        stop_reason: 'refusal',
        marker: expect.any(String),
      });
  } finally {
    restarted.$client.close();
  }
});
