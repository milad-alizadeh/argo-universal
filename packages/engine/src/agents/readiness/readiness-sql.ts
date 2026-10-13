import { AgentCheck, type AgentStatus } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { isNotNull } from 'drizzle-orm';

type SavedCheck = { status: AgentStatus; reason?: string };
const checking: SavedCheck = { status: 'checking' };

type Row = { id: string; status: string | null; reason: string | null };
const parseRow = ({ status, reason }: Row): SavedCheck => {
  const parsed = AgentCheck.safeParse({ status, reason: reason ?? undefined });
  return parsed.success ? parsed.data : checking;
};
const readRows = (database: Database): Row[] =>
  database
    .select({
      id: agents.id,
      status: agents.readinessStatus,
      reason: agents.readinessReason,
    })
    .from(agents)
    .where(isNotNull(agents.configuration))
    .all();

// The last saved Readiness per Agent; an Agent with no finished check reads as Checking….
export const readSavedReadiness = (
  database: Database,
): ((agentId: string) => SavedCheck) => {
  const rows = new Map(
    readRows(database).map((row) => [row.id, parseRow(row)]),
  );
  return (agentId) => rows.get(agentId) ?? checking;
};
