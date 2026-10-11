import { blob } from '@repo/db/schema';
import { sql } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../storage';

type BlobMetadata = Pick<typeof blob.$inferInsert, 'id' | 'mime' | 'bytes'>;

// Records an uploaded Blob; uploading it again renews its age for cleanup.
export class BlobMetadataUpsertJob implements WriterJob {
  public constructor(private readonly metadata: { blob: BlobMetadata }) {}

  public describe(): string {
    return `upsert Blob metadata ${this.metadata.blob.id}`;
  }

  public commit(transaction: StorageTransaction): void {
    transaction
      .insert(blob)
      .values(this.metadata.blob)
      .onConflictDoUpdate({
        target: blob.id,
        set: { createdAt: sql`excluded.created_at` },
      })
      .run();
  }
}
