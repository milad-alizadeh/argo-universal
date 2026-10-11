import { type HasDefault, type NotNull, sql } from 'drizzle-orm';
import { integer, type SQLiteIntegerBuilder } from 'drizzle-orm/sqlite-core';

/*
 * Times are Unix milliseconds. JSON columns are text; the Server validates them on write and read.
 * The database stamps `createdAt` and `startedAt` on insert, and a trigger stamps `updatedAt` on update (migration `updated_at_triggers`).
 */
const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;
export const timestamp = (): HasDefault<NotNull<SQLiteIntegerBuilder>> =>
  integer().notNull().default(now);
