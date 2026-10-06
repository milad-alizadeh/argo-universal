import {
  SessionInfo,
  SessionRecord,
  type SessionUpdate,
  Turn,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { feedRow, session, turn } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, desc, eq } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import { z } from 'zod';
import type { FeedActorRef } from '../feed/feed-machine';
import { fromFeedRow, queuedFeedRows } from '../feed/feed-row';
import type { writerMachine } from '../feed/writer-machine';
import { toLiveHeader } from './live-header';
import { readLiveHeaderRows } from './live-header-rows';
import type { RegistryActorRef } from './registry-machine';
import { deriveSessionStatus } from './session-status';

const storedSession = SessionRecord;
const storedTurn = Turn;
const interruptedError = z.object({ code: z.literal('interrupted') });

export function createSessionListReader(options: {
  database: Database;
  sessions: RegistryActorRef;
  writer: () => ActorRefFrom<typeof writerMachine> | undefined;
}) {
  const { database, sessions, writer } = options;
  let rejectedShapes = 0;
  const validate = <Value>(read: () => Value): Value => {
    try {
      return read();
    } catch (error) {
      rejectedShapes += 1;
      console.error(`sessions: rejected list shape #${rejectedShapes}`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unrecognised Session list data',
      });
    }
  };
  const readAll = () => {
    const jobs = writer()?.getSnapshot().context.queue ?? [];
    const storedTurns = new Map(
      database
        .select()
        .from(turn)
        .all()
        .map((row) => [row.id, validate(() => storedTurn.parse(row))]),
    );
    for (const job of jobs) {
      if (job.type === 'turnInsert') {
        const previous = storedTurns.get(job.turn.id);
        storedTurns.set(
          job.turn.id,
          validate(() =>
            storedTurn.parse({
              startedAt: Date.now(),
              endedAt: null,
              error: null,
              usage: null,
              stopReason: null,
              ...previous,
              ...job.turn,
            }),
          ),
        );
      }
      if (job.type === 'turnUpdate') {
        const row = storedTurns.get(job.id);
        if (row)
          storedTurns.set(
            job.id,
            validate(() => storedTurn.parse({ ...row, ...job.set })),
          );
      }
    }
    const turns = [...storedTurns.values()];
    const rows = database
      .select()
      .from(session)
      .all()
      .map((row) => {
        for (const job of jobs) {
          if (job.type === 'sessionRowUpdate' && job.id === row.id)
            Object.assign(row, job.set);
          if (
            job.type === 'feedRows' &&
            job.sessionId === row.id &&
            job.maxRevision > row.maxRevision
          ) {
            row.maxRevision = job.maxRevision;
            row.activityAt = job.activityAt ?? row.activityAt;
          }
        }
        return validate(() => storedSession.parse(row));
      });
    return rows
      .filter((row) => row.parentSessionId === null)
      .map((row) => {
        const actor = sessions.getSnapshot().context.sessions[row.id];
        const live = actor?.getSnapshot();
        const feed = live?.children.feed as FeedActorRef | undefined;
        const changes = [
          ...(['agent_message', 'plan_update'] as const).flatMap((kind) =>
            database
              .select()
              .from(feedRow)
              .where(
                and(
                  eq(feedRow.sessionId, row.id),
                  eq(feedRow.sessionUpdate, kind),
                ),
              )
              .orderBy(desc(feedRow.position))
              .limit(1)
              .all()
              .map((stored) => validate(() => fromFeedRow(row.id, stored))),
          ),
          ...queuedFeedRows(writer(), row.id).flatMap((job) =>
            job.rows.map((stored) =>
              validate(() => fromFeedRow(row.id, stored)),
            ),
          ),
          ...Object.values(feed?.getSnapshot().context.rows ?? {}),
        ];
        const newest = new Map<string, SessionUpdate>();
        for (const change of changes) {
          const known = newest.get(change.id);
          if (!known || change.revision >= known.revision)
            newest.set(change.id, change);
        }
        const updates = [...newest.values()].sort(
          (first, second) => first.position - second.position,
        );
        const latestTurn = turns
          .filter((turn) => turn.sessionId === row.id)
          .sort(
            (first, second) =>
              second.startedAt - first.startedAt ||
              second.id.localeCompare(first.id),
          )[0];
        const running = live
          ? live.context.activeTurnId !== null
          : latestTurn?.status === 'running';
        const pendingPermission = live?.context.permissionQueue[0];
        const pendingElicitation = live?.context.pendingElicitation;
        const needsInput = Boolean(pendingPermission || pendingElicitation);
        const maxRevision = Math.max(
          row.maxRevision,
          feed?.getSnapshot().context.maxRevision ?? 0,
        );
        if (feed && feed.getSnapshot().context.maxRevision > row.maxRevision)
          row.activityAt = feed.getSnapshot().context.activityAt;
        const status = deriveSessionStatus({
          needsInput,
          running,
          failure: live?.context.failure ?? row.failure,
          latestTurnFailed: latestTurn?.stopReason === 'error',
          latestTurnInterrupted: interruptedError.safeParse(latestTurn?.error)
            .success,
          maxRevision,
          seenRevision: row.seenRevision,
        });
        const message = updates.findLast(
          (update) => update.sessionUpdate === 'agent_message',
        );
        const activeTurnId =
          live?.context.activeTurnId ??
          (running ? (latestTurn?.id ?? null) : null);
        const liveHeader = validate(() =>
          toLiveHeader(
            {
              activeTurnId,
              permissionQueue: live?.context.permissionQueue ?? [],
              pendingElicitation: pendingElicitation ?? null,
            },
            Object.values(
              readLiveHeaderRows({
                database,
                writer: writer(),
                sessionId: row.id,
                turnId: activeTurnId,
                rows: feed?.getSnapshot().context.rows ?? {},
              }),
            ),
          ),
        );
        const plan = updates.findLast(
          (update) => update.sessionUpdate === 'plan_update',
        );
        const children = rows.filter(
          (child) => child.parentSessionId === row.id,
        );
        let activity: string;
        if (needsInput) {
          activity = pendingPermission?.title ?? 'Waiting for your answer';
        } else if (running) {
          activity = liveHeader ?? 'Working';
        } else {
          activity =
            message?.content
              .filter((block) => block.type === 'text')
              .map((block) => block.text)
              .join('\n')
              .split('\n')[0] ?? '';
        }
        const information = validate(() =>
          SessionInfo.parse({
            sessionId: row.id,
            projectId: row.projectId,
            agent: row.agent,
            parentSessionId: row.parentSessionId,
            cwd: row.checkoutPath,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            title: row.title,
            titleSource: row.titleSource,
            status,
            activity,
            activityAt: row.activityAt,
            checkout: {
              type:
                row.checkoutBranch === `argo/${row.id}` ? 'worktree' : 'main',
              path: row.checkoutPath,
              branch: row.checkoutBranch,
            },
            plan:
              plan?.plan.type === 'items'
                ? {
                    done: plan.plan.entries.filter(
                      (entry) => entry.status === 'completed',
                    ).length,
                    total: plan.plan.entries.length,
                  }
                : null,
            subagents: {
              total: children.length,
              running: children.filter((child) =>
                turns.some(
                  (turn) =>
                    turn.sessionId === child.id && turn.status === 'running',
                ),
              ).length,
            },
            shells: { total: 0, running: 0 },
            archivedAt: row.archivedAt,
            issue: null,
            pullRequest: null,
          }),
        );
        return { information, running };
      });
  };
  return readAll;
}
