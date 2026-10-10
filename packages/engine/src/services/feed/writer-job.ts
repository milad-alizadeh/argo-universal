import { SessionRecord, type SessionUpdate, Turn } from '@repo/contracts';
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
import { toFeedRowWrite } from './feed-row';
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
          if (job.blobIds?.length)
            transaction
              .insert(blobRef)
              .select(
                transaction
                  .select({
                    blobId: blob.id,
                    sessionId: sql<string>`${job.sessionId}`.as('session_id'),
                  })
                  .from(blob)
                  .where(inArray(blob.id, job.blobIds)),
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

// One line naming what a job would have written, for the log of lost jobs.
export function describeJob(job: WriterJob): string {
  switch (job.type) {
    case 'blobMetadataUpsert':
      return `upsert Blob metadata ${job.blob.id}`;
    case 'agentCatalogReplace':
      return `replace catalog with ${job.rows.length} accepted Agent rows`;
    case 'syncJobUpdate':
      return `update sync job ${job.source}/${job.scope}`;
    case 'feedRows':
      return `Feed rows ${job.rows.map((row): string => row.id).join(', ')} of Session ${job.sessionId} at maxRevision ${job.maxRevision}`;
    case 'sessionInsert':
      return `insert Session ${job.session.id} of Project ${job.session.projectId}`;
    case 'turnInsert':
      return `insert Turn ${job.turn.id} of Session ${job.turn.sessionId}`;
    case 'turnUpdate':
      return `update Turn ${job.id}: ${Object.keys(job.set).join(', ')}`;
    case 'sessionRowUpdate':
      return `update Session ${job.id}: ${Object.keys(job.set).join(', ')}`;
    default: {
      const unhandled: never = job;
      throw new Error(`Unhandled writer job ${unhandled}`);
    }
  }
}

export function applyQueuedSession({
  row,
  sessionId,
  jobs,
}: {
  row: typeof session.$inferSelect | undefined;
  sessionId: string;
  jobs: readonly WriterJob[];
}): SessionRecord | undefined {
  let current = row && SessionRecord.parse(row);
  for (const job of jobs) {
    switch (job.type) {
      case 'sessionRowUpdate':
        if (!current || job.id !== sessionId) break;
        current = SessionRecord.parse({
          ...current,
          ...job.set,
          ...(job.set.maxRevision === undefined
            ? {}
            : {
                activityAt:
                  job.set.maxRevision > current.maxRevision
                    ? (job.activityAt ?? current.activityAt)
                    : current.activityAt,
              }),
        });
        break;
      case 'sessionInsert':
        if (job.session.id === sessionId)
          current = SessionRecord.parse({
            title: '',
            titleSource: 'prompt',
            archivedAt: null,
            seenRevision: 0,
            activityAt: 0,
            failure: null,
            vendorSessionId: null,
            parentSessionId: null,
            checkoutBranch: null,
            vendorRef: null,
            configValues: [],
            epoch: 0,
            maxRevision: 0,
            createdAt: 0,
            updatedAt: 0,
            ...job.session,
          });
        break;
      case 'feedRows':
        if (
          current &&
          job.sessionId === sessionId &&
          job.maxRevision > current.maxRevision
        )
          current = {
            ...current,
            maxRevision: job.maxRevision,
            activityAt: job.activityAt ?? current.activityAt,
          };
        break;
      case 'turnInsert':
      case 'turnUpdate':
      case 'blobMetadataUpsert':
      case 'agentCatalogReplace':
      case 'syncJobUpdate':
        break;
      default: {
        const unhandled: never = job;
        throw new Error(`Unhandled writer job ${unhandled}`);
      }
    }
  }
  return current;
}

export function applyQueuedTurns(
  rows: readonly Turn[],
  jobs: readonly WriterJob[],
): Turn[] {
  const turns = new Map(rows.map((row): [string, Turn] => [row.id, row]));
  for (const job of jobs) {
    switch (job.type) {
      case 'turnInsert':
        turns.set(
          job.turn.id,
          Turn.parse({
            startedAt: 0,
            endedAt: null,
            error: null,
            usage: null,
            stopReason: null,
            model: null,
            ...job.turn,
          }),
        );
        break;
      case 'turnUpdate': {
        const row = turns.get(job.id);
        if (row) turns.set(job.id, Turn.parse({ ...row, ...job.set }));
        break;
      }
      case 'sessionInsert':
      case 'sessionRowUpdate':
      case 'feedRows':
      case 'blobMetadataUpsert':
      case 'agentCatalogReplace':
      case 'syncJobUpdate':
        break;
      default: {
        const unhandled: never = job;
        throw new Error(`Unhandled writer job ${unhandled}`);
      }
    }
  }
  return [...turns.values()];
}

export type FeedRowsJob = Extract<WriterJob, { type: 'feedRows' }>;

export function queuedFeedRows(
  jobs: readonly WriterJob[],
  sessionId: string,
): FeedRowsJob[] {
  const rows: FeedRowsJob[] = [];
  for (const job of jobs) {
    switch (job.type) {
      case 'feedRows':
        if (job.sessionId === sessionId) rows.push(job);
        break;
      case 'sessionInsert':
      case 'sessionRowUpdate':
      case 'turnInsert':
      case 'turnUpdate':
      case 'blobMetadataUpsert':
      case 'agentCatalogReplace':
      case 'syncJobUpdate':
        break;
      default: {
        const unhandled: never = job;
        throw new Error(`Unhandled writer job ${unhandled}`);
      }
    }
  }
  return rows;
}

// Queue time is shared by reads and writes, including retries of the same job.
export function stampWriterJob(job: WriterJob, now: number): WriterJob {
  switch (job.type) {
    case 'feedRows':
      return { ...job, activityAt: job.activityAt ?? now };
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
