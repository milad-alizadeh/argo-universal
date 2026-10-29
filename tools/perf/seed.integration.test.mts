import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SessionListOutput, type SessionInfo } from '@repo/contracts';
import { beforeAll, expect, it } from 'vitest';
import { z } from 'zod';
import bundleEngine from '../../e2e/engine-bundle.ts';
import { startSeededServer } from './seed.mts';

beforeAll(bundleEngine);

const envelope = z.object({ result: z.object({ data: SessionListOutput }) });

async function pageOf(
  httpUrl: string,
  cursor: string | null,
): Promise<SessionListOutput> {
  const input = encodeURIComponent(
    JSON.stringify({ ...(cursor && { cursor }) }),
  );

  const response = await fetch(`${httpUrl}/trpc/session.list?input=${input}`);

  return envelope.parse(await response.json()).result.data;
}

async function listed(serverUrl: string): Promise<SessionInfo[]> {
  const rows: SessionInfo[] = [];
  let cursor: string | null = null;

  do {
    const page = await pageOf(serverUrl.replace('ws:', 'http:'), cursor);
    rows.push(...page.sessions);
    cursor = page.nextCursor;
  } while (cursor);

  return rows;
}

it('exposes the full seeded dataset through the paginated public Sessions list', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'argo-perf-seed-regression-'),
  );

  const server = await startSeededServer(directory);

  try {
    const sessions = await listed(server.serverUrl);

    expect(sessions).toHaveLength(server.sessionCount);
    expect(new Set(sessions.map(({ sessionId }) => sessionId)).size).toBe(
      server.sessionCount,
    );
    expect(sessions.map(({ title }) => title)).toContain(
      server.shortSessionTitle,
    );
    expect(sessions.map(({ title }) => title)).toContain(
      server.longSessionTitle,
    );
  } finally {
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
