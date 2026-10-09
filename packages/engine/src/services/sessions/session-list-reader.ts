import type { SessionUpdate } from '@repo/contracts';
import {
  SessionInfo,
  SessionRecord,
  Turn,
  selectPlanRowWithLatestContent,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import {
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import {
  alias,
  type SQLiteAsyncSelectBase,
  type SQLiteSelectWithout,
} from 'drizzle-orm/sqlite-core';
import type { ActorRefFrom } from 'xstate';
import { createRejectionCounter } from '../../lib/count-rejections';
import { hydrateStoredFeedRow, newestRows, storedFeedColumns } from '../feed';
import {
  applyQueuedSession,
  applyQueuedTurns,
  queuedFeedRows,
  type WriterJob,
} from '../feed';
import type { writerMachine } from '../feed';
import { createLiveHeaderRowsReader } from './live-header-rows';
import type { RegistryActorRef } from './registry-machine';
import { latestTurnOf, toSessionInfo } from './session-info';
import type { SessionListState } from './session-list-machine';
import { decodeStoredSession, storedSessionColumns } from './session-record';

const storedTurnColumns = {
  ...getTableColumns(turn),
  error: sql<unknown>`${turn.error}`,
  usage: sql<unknown>`${turn.usage}`,
};

type ChildTurnIdsQuery = SQLiteSelectWithout<
  SQLiteAsyncSelectBase<
    'session',
    'sync',
    ReturnType<Database['run']>,
    { id: SQL<string> },
    'partial'
  >,
  false,
  'where'
>;

interface ListReadInput {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine> | undefined;
  readLiveHeaderRows: ReturnType<typeof createLiveHeaderRowsReader>;
  validate<Value>(read: () => Value): Value | undefined;
  rejectedSessions: Set<string>;
}

export function createSessionListReader(options: {
  database: Database;
  sessions: RegistryActorRef;
  writer: () => ActorRefFrom<typeof writerMachine> | undefined;
}): {
  readRows: (sessionIds?: readonly string[]) => SessionListState;
  sessionIdsForJobs: (jobs: readonly WriterJob[]) => string[];
  relatedSessionIds: (sessionIds: readonly string[]) => string[];
} {
  const { database, sessions, writer } = options;
  const readLiveHeaderRows = createLiveHeaderRowsReader({ database });
  const rejections = createRejectionCounter('sessions');
  const validate = <Value>(read: () => Value): Value | undefined => {
    try {
      return read();
    } catch (error) {
      rejections.report('rejected list shape', error);
      return undefined;
    }
  };
  const parents = new Map<string, string | null>();
  const readRows = (sessionIds?: readonly string[]): SessionListState => {
    const input = {
      database,
      writer: writer(),
      validate,
      readLiveHeaderRows,
      rejectedSessions: new Set<string>(),
    };
    if (!sessionIds) parents.clear();
    const ids = sessionIds && new Set(sessionIds);
    if (ids)
      for (const id of ids) {
        const parent = parents.get(id);
        if (parent) ids.add(parent);
      }
    let rows = readListSessions(input, ids && [...ids]);
    const addedParents = new Set<string>();
    for (const row of rows) {
      parents.set(row.id, row.parentSessionId);
      if (
        ids?.has(row.id) &&
        row.parentSessionId &&
        !ids.has(row.parentSessionId)
      )
        addedParents.add(row.parentSessionId);
    }
    if (addedParents.size) {
      for (const id of addedParents) ids?.add(id);
      rows = [
        ...new Map(
          [...rows, ...readListSessions(input, [...addedParents])].map(
            (row): [string, SessionRecord] => [row.id, row],
          ),
        ).values(),
      ];
    }
    return rows
      .filter(
        (row): boolean =>
          row.parentSessionId === null && (!ids || ids.has(row.id)),
      )
      .flatMap((row): SessionListState => {
        const children = rows.filter(
          (child): boolean => child.parentSessionId === row.id,
        );
        const turns = readListTurns(
          input,
          row.id,
          children.map((child): string => child.id),
        );
        if (input.rejectedSessions.has(row.id)) return [];
        const result = readSessionInformation({
          ...input,
          sessions,
          turns,
          rows: children.filter(
            (child): boolean => !input.rejectedSessions.has(child.id),
          ),
          row,
        });
        return result ? [result] : [];
      });
  };
  const sessionIdsForJobs = (jobs: readonly WriterJob[]): string[] => [
    ...new Set(
      jobs.flatMap((job): string[] => {
        switch (job.type) {
          case 'feedRows':
            return [job.sessionId];
          case 'sessionInsert':
            return [
              job.session.id,
              ...(job.session.parentSessionId
                ? [job.session.parentSessionId]
                : []),
            ];
          case 'sessionRowUpdate':
            return [
              job.id,
              ...(job.set.parentSessionId ? [job.set.parentSessionId] : []),
            ];
          case 'turnInsert':
            return [job.turn.sessionId];
          case 'turnUpdate':
            return readTurnSessionIds({
              database,
              sessions,
              jobs: [...jobs, ...(writer()?.getSnapshot().context.queue ?? [])],
              turnId: job.id,
              validate,
            });
          case 'blobMetadataUpsert':
          case 'agentCatalogReplace':
          case 'syncJobUpdate':
            return [];
          default: {
            const unhandled: never = job;
            throw new Error(`Unhandled writer job ${unhandled}`);
          }
        }
      }),
    ),
  ];
  const relatedSessionIds = (sessionIds: readonly string[]): string[] => {
    const ids = new Set(sessionIds);
    for (const id of ids) {
      const parent = parents.get(id);
      if (parent) ids.add(parent);
    }
    return [...ids];
  };
  return { readRows, sessionIdsForJobs, relatedSessionIds };
}

function readTurnSessionIds(input: {
  database: Database;
  sessions: RegistryActorRef;
  jobs: readonly WriterJob[];
  turnId: string;
  validate: ListReadInput['validate'];
}): string[] {
  const queued = input.jobs.find(
    (job): boolean => job.type === 'turnInsert' && job.turn.id === input.turnId,
  );
  if (queued?.type === 'turnInsert') return [queued.turn.sessionId];
  const live = Object.values(
    input.sessions.getSnapshot().context.sessions,
  ).find(
    (actor): boolean =>
      actor.getSnapshot().context.activeTurnId === input.turnId,
  );
  if (live) return [live.getSnapshot().context.sessionId];
  const stored = input.database
    .select({ sessionId: turn.sessionId })
    .from(turn)
    .where(eq(turn.id, input.turnId))
    .get();
  const id =
    stored &&
    input.validate((): string =>
      SessionRecord.shape.id.parse(stored.sessionId),
    );
  return id ? [id] : [];
}

function readListSessions(
  input: ListReadInput,
  sessionIds?: readonly string[],
): SessionRecord[] {
  const jobs = input.writer?.getSnapshot().context.queue ?? [];
  const stored = input.database
    .select(storedSessionColumns)
    .from(session)
    .where(
      sessionIds
        ? or(
            inArray(session.id, sessionIds),
            inArray(session.parentSessionId, sessionIds),
          )
        : undefined,
    )
    .all();
  const rows = new Map(
    stored.map((row): [string, typeof row] => [row.id, row]),
  );
  const ids = new Set([
    ...rows.keys(),
    ...jobs.flatMap((job): string[] =>
      job.type === 'sessionInsert' &&
      (!sessionIds ||
        sessionIds.includes(job.session.id) ||
        (job.session.parentSessionId &&
          sessionIds.includes(job.session.parentSessionId)))
        ? [job.session.id]
        : [],
    ),
  ]);
  return [...ids].flatMap((id): SessionRecord[] => {
    const row = input.validate((): ReturnType<typeof applyQueuedSession> => {
      const stored = rows.get(id);
      return applyQueuedSession({
        row: stored && decodeStoredSession(stored),
        sessionId: id,
        jobs,
      });
    });
    return row ? [row] : [];
  });
}

function readListTurns(
  input: ListReadInput,
  sessionId: string,
  children: string[],
): Turn[] {
  const jobs = input.writer?.getSnapshot().context.queue ?? [];
  const updates = jobs.flatMap((job): string[] =>
    job.type === 'turnUpdate' ? [job.id] : [],
  );
  const unchanged = updates.length ? notInArray(turn.id, updates) : undefined;
  const runningIds = readChildTurnIds({
    database: input.database,
    updates,
    children,
    running: true,
  });
  const latestIds = readChildTurnIds({
    database: input.database,
    updates,
    children,
    running: false,
  });
  const rows = [
    ...input.database
      .select(storedTurnColumns)
      .from(turn)
      .where(and(eq(turn.sessionId, sessionId), unchanged))
      .orderBy(desc(turn.startedAt), desc(turn.id))
      .limit(1)
      .all(),
    ...(children.length
      ? input.database
          .select(storedTurnColumns)
          .from(turn)
          .where(or(inArray(turn.id, runningIds), inArray(turn.id, latestIds)))
          .all()
      : []),
    ...(updates.length
      ? input.database
          .select(storedTurnColumns)
          .from(turn)
          .where(
            and(
              inArray(turn.sessionId, [sessionId, ...children]),
              inArray(turn.id, updates),
            ),
          )
          .all()
      : []),
  ];
  const ids = new Set([sessionId, ...children]);
  const parseTurn = (
    row: typeof turn.$inferSelect | Turn,
    stored = false,
  ): Turn[] => {
    const parsed = input.validate((): Turn =>
      Turn.parse(
        stored
          ? {
              ...row,
              error: row.error === null ? null : JSON.parse(String(row.error)),
              usage: row.usage === null ? null : JSON.parse(String(row.usage)),
            }
          : row,
      ),
    );
    if (!parsed) input.rejectedSessions.add(row.sessionId);
    return parsed ? [parsed] : [];
  };
  return applyQueuedTurns(
    rows.flatMap((row): Turn[] => parseTurn(row, true)),
    jobs,
  )
    .filter((row): boolean => ids.has(row.sessionId))
    .flatMap((row): Turn[] => parseTurn(row));
}

function readChildTurnIds(input: {
  database: Database;
  updates: string[];
  children: string[];
  running: boolean;
}): ChildTurnIdsQuery {
  const candidate = alias(turn, 'candidate_turn');
  const latest = input.database
    .select({ id: candidate.id })
    .from(candidate)
    .where(
      and(
        eq(candidate.sessionId, session.id),
        input.running ? eq(candidate.status, 'running') : undefined,
        input.updates.length
          ? notInArray(candidate.id, input.updates)
          : undefined,
      ),
    )
    .orderBy(desc(candidate.startedAt), desc(candidate.id))
    .limit(1);
  return input.database
    .select({ id: sql<string>`(${latest})` })
    .from(session)
    .where(inArray(session.id, input.children));
}

function readSessionInformation(
  input: ListReadInput & {
    sessions: RegistryActorRef;
    row: SessionRecord;
    rows: readonly SessionRecord[];
    turns: readonly Turn[];
  },
): SessionListState[number] | undefined {
  const {
    database,
    writer,
    validate,
    readLiveHeaderRows,
    sessions,
    row,
    rows,
    turns,
  } = input;
  const actor = sessions.getSnapshot().context.sessions[row.id];
  const live = actor?.getSnapshot();
  const feed = live?.children.feed;
  const feedContext = feed?.getSnapshot().context;
  const changes = [
    ...(['agent_message', 'plan_update'] as const).flatMap(
      (kind): (SessionUpdate | undefined)[] =>
        database
          .select(storedFeedColumns)
          .from(feedRow)
          .where(
            and(eq(feedRow.sessionId, row.id), eq(feedRow.sessionUpdate, kind)),
          )
          .orderBy(
            desc(
              kind === 'plan_update'
                ? sql`coalesce(json_extract(${feedRow.payload}, '$._meta.argo.contentRevision'), ${feedRow.revision})`
                : feedRow.position,
            ),
          )
          .limit(1)
          .all()
          .map((stored): SessionUpdate | undefined =>
            validate((): SessionUpdate => hydrateStoredFeedRow(row.id, stored)),
          ),
    ),
    ...queuedFeedRows(
      writer?.getSnapshot().context.queue ?? [],
      row.id,
    ).flatMap((job): SessionUpdate[] => job.rows),
    ...Object.values(feedContext?.rows ?? {}),
  ];
  const rejected = changes.includes(undefined);
  const updates = [
    ...newestRows(
      changes.filter((row): row is SessionUpdate => row !== undefined),
    ).values(),
  ].sort((first, second): number => first.position - second.position);
  const latestTurn = latestTurnOf(turns, row.id);
  const activeTurnId =
    live?.context.activeTurnId ??
    (!live && latestTurn?.status === 'running' ? latestTurn.id : null);
  const header = readLiveHeaderRows({
    writer,
    sessionId: row.id,
    turnId: activeTurnId,
    rows: feedContext?.rows ?? {},
  });
  const result = toSessionInfo({
    row,
    turns,
    message: updates.findLast(
      (
        update,
      ): update is Extract<
        import('@repo/contracts').SessionUpdate,
        { sessionUpdate: 'agent_message' }
      > => update.sessionUpdate === 'agent_message',
    ),
    plan: selectPlanRowWithLatestContent(updates),
    live: live?.context ?? null,
    feed: feedContext ?? null,
    liveHeaderRows: Object.values(header.rows),
    children: rows.filter((child): boolean => child.parentSessionId === row.id),
  });
  const information = validate((): SessionInfo =>
    SessionInfo.parse({
      ...result.information,
      ...(rejected || header.rejected ? { activity: '', plan: null } : {}),
    }),
  );
  return information ? { information, running: result.running } : undefined;
}
