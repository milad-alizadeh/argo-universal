import type { session } from '@repo/db/schema';

export const presentId = (id: string | null | undefined): string[] =>
  id ? [id] : [];

export function insertParents(row: typeof session.$inferInsert): string[] {
  return [
    ...presentId(row.parentSessionId),
    ...presentId(row.startedBySessionId),
  ];
}
