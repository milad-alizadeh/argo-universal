import { turn } from '@repo/db/schema';
import { getTableColumns, sql } from 'drizzle-orm';

export const storedTurnColumns = {
  ...getTableColumns(turn),
  error: sql<unknown>`${turn.error}`,
  usage: sql<unknown>`${turn.usage}`,
};
