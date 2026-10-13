import type { Database } from '@repo/db';
import { releaseLoginTerminalGroups } from '../agents';
import { reconcileInterruptedInstallations } from '../agents';
import {
  attachmentsFolderIn,
  removeOrphanAttachments,
  removeUnusedBlobs,
} from '../blob';
import { recoverAfterRestart } from '../sessions';

export type RecoveryInput = {
  database: Database;
  blobsFolder: string;
  home: string;
};

export async function recoverEngineAfterRestart(
  input: RecoveryInput,
): Promise<void> {
  recoverAfterRestart(input.database);
  await reconcileInterruptedInstallations(input.home);
  await releaseLoginTerminalGroups(input.home);
  await removeUnusedBlobs(input);
  await removeOrphanAttachments({
    database: input.database,
    attachmentsFolder: attachmentsFolderIn(input.home),
  });
}
