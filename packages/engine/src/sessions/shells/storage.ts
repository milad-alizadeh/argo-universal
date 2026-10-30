import type { ShellRecord } from '@repo/contracts';
import { blob, blobRef, shell } from '@repo/db/schema';
import type { StorageTransaction, WriterJob } from '../../storage';
import type { AnnouncedJob, WriterChange } from '../writer-changes';
import { writeShellBlob, type ShellOutputBlob } from './output-blob';

export class ShellWriteJob implements WriterJob, AnnouncedJob {
  public constructor(
    private readonly record: ShellRecord,
    private readonly output?: ShellOutputBlob,
  ) {}
  public announcedChange(): WriterChange {
    return { sessionIds: [this.record.sessionId], turnIds: [] };
  }
  public describe(): string {
    return `store Shell ${this.record.sessionId}/${this.record.id}`;
  }
  public async writeFiles(folder: string | undefined): Promise<void> {
    if (!this.output) return;

    await writeShellBlob(requireBlobFolder(folder), this.output);
  }
  public commit(transaction: StorageTransaction): void {
    if (this.output) this.storeBlob(transaction, this.output);
    transaction
      .insert(shell)
      .values(this.record)
      .onConflictDoUpdate({
        target: [shell.sessionId, shell.id],
        set: this.record,
      })
      .run();
  }
  private storeBlob(
    transaction: StorageTransaction,
    output: ShellOutputBlob,
  ): void {
    const metadata = output.metadata;
    transaction.insert(blob).values(metadata).onConflictDoNothing().run();
    transaction
      .insert(blobRef)
      .values({ blobId: metadata.id, sessionId: this.record.sessionId })
      .onConflictDoNothing()
      .run();
  }
}

const requireBlobFolder = (folder: string | undefined): string => {
  if (!folder) throw new Error('Shell Blob storage is unavailable');

  return folder;
};
