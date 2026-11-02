import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { SessionInfo } from '@repo/contracts';
import { operations } from '@repo/contracts/operations';
import { beforeAll, expect, it } from 'vitest';
import { z } from 'zod';
import bundleEngine from '../../e2e/engine-bundle.ts';
import { startOwnServer } from '../../e2e/own-server.ts';
import { asTheApp } from './app-origin.mts';
import { withTemplateSession } from './template-session.mts';

beforeAll(bundleEngine);

const responseSchema = z.object({
  result: z.object({ data: operations['session.list'].result }),
});

async function readStoredSessions(directory: string): Promise<SessionInfo[]> {
  const server = await startOwnServer(directory, {});

  try {
    const response = await fetch(
      `${server.httpUrl}/trpc/session.list?input=%7B%7D`,
      { headers: asTheApp },
    );

    expect(response.ok).toBe(true);

    const { sessions } = responseSchema.parse(await response.json()).result
      .data;

    return sessions;
  } finally {
    await server.stop();
  }
}

it('prepares a settled template through the current Server Operations', async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'argo-template-regression-'),
  );

  try {
    await withTemplateSession(directory);
    const sessions = await readStoredSessions(directory);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.status).not.toBe('running');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
