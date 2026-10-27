import type { Database } from '@repo/db';
import {
  attachmentsFolderIn,
  removeOrphanAttachments,
  removeUnusedBlobs,
} from '../blob';
import {
  recoverAfterRestart,
  recoverArchivedCheckouts,
  recoverShells,
} from '../sessions';
import { releaseShellGroups } from '../shells/shell-record';

export type RecoveryInput = {
  database: Database;
  blobsFolder: string;
  home: string;
};

export async function recoverEngineAfterRestart(
  input: RecoveryInput,
): Promise<void> {
  await releaseShellGroups(input.home);
  await recoverShells(input);
  recoverAfterRestart(input.database);
  await recoverArchivedCheckouts(input.database);
  await removeUnusedBlobs(input);
  await removeOrphanAttachments({
    database: input.database,
    attachmentsFolder: attachmentsFolderIn(input.home),
  });
}
