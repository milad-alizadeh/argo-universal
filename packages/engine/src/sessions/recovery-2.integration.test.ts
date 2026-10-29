import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { blob, blobRef } from '@repo/db/schema';
import { describe, expect, it } from 'vitest';
import {
  home,
  startEngine,
  interruptEngine,
  engineDatabase,
} from './recovery.test.mocks';

describe('Engine restart recovery', (): void => {
  it('deletes blobs no prompt refers to once they are over a day old', async (): Promise<void> => {
    const database = engineDatabase();
    const blobsFolder = join(home, 'blobs');
    mkdirSync(blobsFolder);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const [id, createdAt] of [
      ['old-unused', dayAgo - 60_000],
      ['old-used', dayAgo - 60_000],
      ['new-unused', Date.now()],
    ] as const) {
      writeFileSync(join(blobsFolder, id), id);
      database
        .insert(blob)
        .values({ id, mime: 'image/png', bytes: 2, createdAt })
        .run();
    }

    database
      .insert(blobRef)
      .values({ blobId: 'old-used', sessionId: 'session-1' })
      .run();
    await interruptEngine();
    await startEngine();

    expect(readdirSync(blobsFolder).sort()).toEqual(['new-unused', 'old-used']);
  });
});
