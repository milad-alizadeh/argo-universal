import { session } from '@repo/db/schema';
import { getTableColumns, sql } from 'drizzle-orm';
import { z } from 'zod';

// JSON is decoded per row at the reader boundary, after SQLite has returned the bounded result.
export const storedSessionColumns = {
  ...getTableColumns(session),
  vendorRef: sql<unknown>`${session.vendorRef}`,
  configValues: sql<unknown>`${session.configValues}`,
  heldConfig: sql<unknown>`${session.heldConfig}`,
};

type DecodedSession = Omit<
  typeof session.$inferSelect,
  'vendorRef' | 'configValues' | 'heldConfig'
> & {
  vendorRef: ReturnType<typeof JSON.parse>;
  configValues: ReturnType<typeof JSON.parse>;
  heldConfig: ReturnType<typeof JSON.parse>;
};

export function decodeStoredSession(
  row: typeof session.$inferSelect,
): DecodedSession {
  return {
    ...row,
    vendorRef:
      row.vendorRef === null
        ? null
        : JSON.parse(z.string().parse(row.vendorRef)),
    configValues: JSON.parse(String(row.configValues)),
    heldConfig: JSON.parse(String(row.heldConfig)),
  };
}
