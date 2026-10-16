import type { Database } from '@repo/db';
import { releaseLoginTerminalGroups, releaseShellGroups } from '../agents';
import { reconcileInterruptedInstallations } from '../agents';
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
  await reconcileInterruptedInstallations(input.home);
  await releaseLoginTerminalGroups(input.home);
  await removeUnusedBlobs(input);
  await removeOrphanAttachments({
    database: input.database,
    attachmentsFolder: attachmentsFolderIn(input.home),
  });
}
