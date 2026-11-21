import { rm } from 'node:fs/promises';
import type { Database } from '@repo/db';
import {
  attachmentsFolderIn,
  removeOrphanAttachments,
  removeUnusedBlobs,
} from '../blob';
import { shellTerminalOutputFolder } from '../lib/terminal-owner';
import { recoverRuns } from '../runs';
import {
  recoverAfterRestart,
  recoverArchivedCheckouts,
  recoverShells,
  releaseShellGroups,
} from '../sessions';

export type RecoveryInput = {
  database: Database;
  blobsFolder: string;
  home: string;
};

export async function recoverEngineAfterRestart(
  input: RecoveryInput,
): Promise<void> {
  await releaseShellGroups(input.home);
  await rm(shellTerminalOutputFolder(input.home), {
    recursive: true,
    force: true,
  });
  await recoverShells(input);
  await recoverRuns({ ...input, now: Date.now });
  recoverAfterRestart(input.database);
  await recoverArchivedCheckouts(input.database);
  await removeUnusedBlobs(input);
  await removeOrphanAttachments({
    database: input.database,
    attachmentsFolder: attachmentsFolderIn(input.home),
  });
}
