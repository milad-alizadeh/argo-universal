import {
  ProjectScheduleOccurrence,
  type ProjectScheduleHistoryPage,
} from '@repo/contracts/operations';
import type { Database } from '@repo/db';
import { projectScheduleOccurrence as table } from '@repo/db/schema';
import { and, desc, eq, lt, or } from 'drizzle-orm';

type History = ProjectScheduleHistoryPage;

const pageSize = 50;

export function readScheduleHistory(
  database: Database,
  scheduleId: string,
  cursor?: NonNullable<History['next']>,
): History {
  const older = cursor
    ? or(
        lt(table.at, cursor.at),
        and(eq(table.at, cursor.at), lt(table.id, cursor.id)),
      )
    : undefined;

  const rows = database
    .select()
    .from(table)
    .where(and(eq(table.scheduleId, scheduleId), older))
    .orderBy(desc(table.at), desc(table.id))
    .limit(pageSize + 1)
    .all();

  const page = rows.slice(0, pageSize);
  const edge = rows.length > pageSize ? page.at(-1) : undefined;

  return {
    entries: page.map(({ id, result }) => ({
      id,
      occurrence: ProjectScheduleOccurrence.parse(JSON.parse(result)),
    })),
    next: edge ? { at: edge.at, id: edge.id } : null,
  };
}
