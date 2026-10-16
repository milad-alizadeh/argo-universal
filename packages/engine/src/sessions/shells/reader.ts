import { ShellRecord, type Shell } from '@repo/contracts';
import type { Database } from '@repo/db';
import { shell } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { toShell } from '../acp/shells';

export const readShellRecords = (
  database: Database,
  sessionId: string,
): ShellRecord[] =>
  database
    .select()
    .from(shell)
    .where(eq(shell.sessionId, sessionId))
    .all()
    .map((row) => ShellRecord.parse(row));

export const readShellRecord = (
  database: Database,
  input: { sessionId: string; shellId: string },
): ShellRecord | undefined => {
  const row = database
    .select()
    .from(shell)
    .where(
      and(eq(shell.sessionId, input.sessionId), eq(shell.id, input.shellId)),
    )
    .get();

  return row && ShellRecord.parse(row);
};

export const storedShells = (database: Database, sessionId: string): Shell[] =>
  readShellRecords(database, sessionId).map((record) =>
    toShell(record, { now: Date.now(), terminalAvailable: false }),
  );
