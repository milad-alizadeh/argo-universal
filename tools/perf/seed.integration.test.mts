import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import bundleEngine from '../../e2e/engine-bundle.ts';
import { history, listed } from './seed-public.test.mocks.mts';
import { startSeededServer } from './seed.mts';

beforeAll(bundleEngine);

it('preserves the legacy 241 visible Sessions and 644 recorded Feed rows', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'argo-perf-seed-regression-'),
  );

  const server = await startSeededServer(directory);

  try {
    const sessions = await listed(server.serverUrl);

    expect(sessions).toHaveLength(241);
    expect(new Set(sessions.map(({ sessionId }) => sessionId)).size).toBe(241);
    expect(sessions.map(({ title }) => title)).toContain(
      server.shortSessionTitle,
    );

    const long = sessions.find(
      ({ title }) => title === server.longSessionTitle,
    );

    if (!long)
      throw new Error('The seeded long Session must be publicly listed');

    expect(await history(server.serverUrl, long.sessionId)).toHaveLength(644);
    expect(server.requested.feedRows).toBeUndefined();
  } finally {
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
