import type { SessionUpdate } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  blob,
  blobRef,
  feedRow,
  project,
  session,
  turn,
} from '@repo/db/schema';
import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import { writeContentFile } from '../../lib/content-files';
import { toFeedRowWrite } from './feed-row';
import type { OutputBlob } from './updates/tool-output';
import { measureFeedRowsJob } from './writer-budget';
import {
  applyCatalogSqlJob,
  isCatalogSqlJob,
  type CatalogSqlJob,
} from './writer-catalog-sync';

// One unit of work for the database writer.
export type WriterJob =
  | CatalogSqlJob
  | {
      type: 'blobMetadataUpsert';
      blob: Pick<typeof blob.$inferInsert, 'id' | 'mime' | 'bytes'>;
    }
  | {
      type: 'feedRows';
      sessionId: string;
      rows: SessionUpdate[];
      maxRevision: number;
      activityAt?: number;
      // The blobs the job's prompt rows show.
      blobIds?: string[];
      // Whole tool output the rows show as previews, stored before the rows.
      blobs?: OutputBlob[];
      // What the job holds in memory, measured once when the Writer queues it.
      bytes?: number;
    }
  | {
      type: 'sessionInsert';
      session: typeof session.$inferInsert;
      checkoutChoice: NonNullable<typeof project.$inferInsert.checkoutChoice>;
    }
  | { type: 'turnInsert'; turn: typeof turn.$inferInsert }
  | {
      type: 'turnUpdate';
      id: string;
      set: Partial<Omit<typeof turn.$inferInsert, 'id' | 'sessionId'>>;
    }
  | {
      type: 'sessionRowUpdate';
      id: string;
      activityAt?: number;
      set: Partial<
        Omit<typeof session.$inferInsert, 'id' | 'projectId' | 'createdAt'>
      >;
    };

// A row keeps the position it was first written at, so an update leaves `position` alone.
const feedRowUpdate = {
  sessionUpdate: sql`excluded.session_update`,
  revision: sql`excluded.revision`,
  turnId: sql`excluded.turn_id`,
  state: sql`excluded.state`,
  payload: sql`excluded.payload`,
  payloadVersion: sql`excluded.payload_version`,
  sourceRef: sql`excluded.source_ref`,
  searchText: sql`excluded.search_text`,
};

// Commits every job in order in one transaction; one failing job rolls back them all.
export function writeJobs(
  database: Database,
  jobs: readonly WriterJob[],
): void {
  void database.transaction((transaction): void => {
    for (const job of jobs) {
      if (isCatalogSqlJob(job)) {
        applyCatalogSqlJob(transaction, job);
        continue;
      }
      switch (job.type) {
        case 'blobMetadataUpsert':
          transaction
            .insert(blob)
            .values(job.blob)
            .onConflictDoUpdate({
              target: blob.id,
              set: { createdAt: sql`excluded.created_at` },
            })
            .run();
          break;
        case 'feedRows': {
          insertOutputBlobs(transaction, job);
          if (job.rows.length > 0)
            transaction
              .insert(feedRow)
              .values(
                job.rows.map((row): typeof feedRow.$inferInsert => ({
                  ...toFeedRowWrite(row),
                  sessionId: job.sessionId,
                })),
              )
              .onConflictDoUpdate({
                target: [feedRow.sessionId, feedRow.id],
                set: feedRowUpdate,
              })
              .run();
          // A ref keeps a blob from cleanup; a prompt naming no stored blob adds none.
          const blobIds = [
            ...(job.blobIds ?? []),
            ...(job.blobs ?? []).map((stored): string => stored.blob.blobId),
          ];
          if (blobIds.length > 0)
            transaction
              .insert(blobRef)
              .select(
                transaction
                  .select({
                    blobId: blob.id,
                    sessionId: sql<string>`${job.sessionId}`.as('session_id'),
                  })
                  .from(blob)
                  .where(inArray(blob.id, blobIds)),
              )
              .onConflictDoNothing()
              .run();
          transaction
            .update(session)
            .set({
              maxRevision: job.maxRevision,
              activityAt: job.activityAt ?? Date.now(),
            })
            .where(
              and(
                eq(session.id, job.sessionId),
                gt(sql`${job.maxRevision}`, session.maxRevision),
              ),
            )
            .run();
          break;
        }
        case 'sessionInsert':
          transaction.insert(session).values(job.session).run();
          transaction
            .update(project)
            .set({ checkoutChoice: job.checkoutChoice })
            .where(eq(project.id, job.session.projectId))
            .run();
          break;
        case 'turnInsert':
          transaction.insert(turn).values(job.turn).run();
          break;
        case 'turnUpdate':
          transaction
            .update(turn)
            .set(job.set)
            .where(eq(turn.id, job.id))
            .run();
          break;
        case 'sessionRowUpdate':
          transaction
            .update(session)
            .set({
              ...job.set,
              ...(job.set.maxRevision === undefined
                ? {}
                : {
                    activityAt: sql`case when ${job.set.maxRevision} > ${session.maxRevision} then ${job.activityAt ?? Date.now()} else ${session.activityAt} end`,
                  }),
            })
            .where(eq(session.id, job.id))
            .run();
          break;
        default: {
          const unhandled: never = job;
          throw new Error(`Unhandled writer job ${unhandled}`);
        }
      }
    }
  });
}

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function insertOutputBlobs(
  transaction: Transaction,
  job: Extract<WriterJob, { type: 'feedRows' }>,
): void {
  for (const { blob: stored } of job.blobs ?? [])
    transaction
      .insert(blob)
      .values({ id: stored.blobId, mime: stored.mime, bytes: stored.bytes })
      .onConflictDoNothing()
      .run();
}

// Writes the files of the jobs' output Blobs, so their rows never name a missing file.
export async function writeJobBlobFiles(
  blobsFolder: string,
  jobs: readonly WriterJob[],
): Promise<void> {
  for (const job of jobs)
    if (job.type === 'feedRows')
      for (const stored of job.blobs ?? [])
        await writeContentFile(blobsFolder, stored.blob.blobId, stored.data);
}

// Queue time is shared by reads and writes, including retries of the same job.
export function stampWriterJob(job: WriterJob, now: number): WriterJob {
  switch (job.type) {
    case 'feedRows':
      return {
        ...job,
        activityAt: job.activityAt ?? now,
        bytes: job.bytes ?? measureFeedRowsJob(job),
      };
    case 'sessionInsert':
      return {
        ...job,
        session: {
          ...job.session,
          createdAt: job.session.createdAt ?? now,
          updatedAt: job.session.updatedAt ?? now,
        },
      };
    case 'turnInsert':
      return {
        ...job,
        turn: { ...job.turn, startedAt: job.turn.startedAt ?? now },
      };
    case 'sessionRowUpdate':
      return job.set.maxRevision === undefined
        ? job
        : { ...job, activityAt: job.activityAt ?? now };
    case 'turnUpdate':
    case 'blobMetadataUpsert':
    case 'agentCatalogReplace':
    case 'syncJobUpdate':
      return job;
    default: {
      const unhandled: never = job;
      throw new Error(`Unhandled writer job ${unhandled}`);
    }
  }
}
