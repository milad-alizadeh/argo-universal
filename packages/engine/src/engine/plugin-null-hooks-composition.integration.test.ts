import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  hookRecords,
  recordingSource,
  writeHookPlugins,
} from '#mocks/hook-plugins';

it('accepts null answers that intercept Session start and Turn completion', async () => {
  const hooks = ['session.start', 'turn.complete'] as const;

  const host = await startAcpEngine({
    steps: [],
    installPlugins: (home) =>
      writeHookPlugins(home, [
        {
          id: 'a-intercept',
          hooks: [...hooks],
          source: recordingSource(`
        await on('session.start', () => null);
        await on('turn.complete', () => null);
      `),
        },
        {
          id: 'b-downstream',
          hooks: [...hooks],
          source: recordingSource(`
        await on('session.start', (ctx, e, next) => next(e));
        await on('turn.complete', (ctx, e, next) => next(e));
      `),
        },
      ]),
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Hello' }],
  });
  await waitForAcpSnapshot(
    host,
    sessionId,
    (snapshot) => snapshot.activeTurnId === null,
  );

  await expect
    .poll(async () =>
      (await hookRecords(host.home, 'a-intercept')).map(({ name }) => name),
    )
    .toEqual(hooks);
  expect(await hookRecords(host.home, 'b-downstream')).toEqual([]);
  expect(
    await readFile(join(host.home, 'logs/plugins.log'), 'utf8'),
  ).not.toContain('wrong shape');
}, 20_000);
