import { join } from 'node:path';
import { openReadOnlyDatabase } from '@repo/db/plugin-database';
import { serverSettings } from '@repo/db/schema';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { z } from 'zod';

// SQLite keeps a boolean as 0 or 1; anything else is a damaged row.
const StoredFlag = z.literal([0, 1]);

/*
 * The keep-running setting as the Server left it on disk, for the one moment nobody can be asked: the desktop app is quitting and has no live answer.
 * The file is opened read-only, so this can neither write nor migrate it, and a Server holding it is not disturbed.
 * Only a value that is read and is a boolean counts. A missing file, a locked or unreadable database and a damaged row all throw, and the caller treats a throw as "stop the Server".
 */
export function readStoredKeepRunning(home: string): boolean {
  const client = openReadOnlyDatabase(join(home, 'argo.db'));

  try {
    // The raw column, not the boolean the schema maps it to, which would read any non-zero value as true.
    const row = drizzle({ client })
      .select({ stored: sql<unknown>`${serverSettings.keepRunningAfterQuit}` })
      .from(serverSettings)
      .get();

    return StoredFlag.parse(row?.stored ?? 0) === 1;
  } finally {
    client.close();
  }
}
