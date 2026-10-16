import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { hydrateStoredFeedRow, storedFeedColumns } from '../../../feed';
import type { ListReadInput } from './input';

export function readStoredActivity(
  input: ListReadInput,
  sessionId: string,
): (SessionUpdate | undefined)[] {
  return (['agent_message', 'plan_update'] as const).flatMap(
    (kind): (SessionUpdate | undefined)[] =>
      readActivityKind({ input, sessionId, kind }),
  );
}

type ActivityKind = 'agent_message' | 'plan_update';

type ActivityRead = {
  input: ListReadInput;
  sessionId: string;
  kind: ActivityKind;
};

function readActivityKind(
  request: ActivityRead,
): (SessionUpdate | undefined)[] {
  const { input, sessionId, kind } = request;

  return input.database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(activityFilter(sessionId, kind))
    .orderBy(desc(activityOrder(kind)))
    .limit(1)
    .all()
    .map((stored): SessionUpdate | undefined =>
      readActivityRow(input, sessionId, stored),
    );
}

function activityOrder(kind: ActivityKind): SQL | typeof feedRow.position {
  return kind === 'plan_update'
    ? sql`coalesce(json_extract(${feedRow.payload}, '$._meta.argo.contentRevision'), ${feedRow.revision})`
    : feedRow.position;
}

function activityFilter(
  sessionId: string,
  kind: ActivityKind,
): SQL | undefined {
  return and(eq(feedRow.sessionId, sessionId), eq(feedRow.sessionUpdate, kind));
}

function readActivityRow(
  input: ListReadInput,
  sessionId: string,
  stored: Parameters<typeof hydrateStoredFeedRow>[1],
): SessionUpdate | undefined {
  return input.validate((): SessionUpdate =>
    hydrateStoredFeedRow(sessionId, stored),
  );
}
