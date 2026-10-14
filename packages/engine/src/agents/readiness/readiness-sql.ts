import { AgentCheck, type AgentStatus } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { isNotNull } from 'drizzle-orm';

type SavedCheck = {
  status: AgentStatus;
  reason?: string;
  agentVersion?: string;
};

const checking: SavedCheck = { status: 'checking' };

type Row = {
  id: string;
  status: string | null;
  reason: string | null;
  agentVersion: string | null;
};

const statusOf = ({ status, reason }: Row): SavedCheck => {
  const parsed = AgentCheck.safeParse({ status, reason: reason ?? undefined });

  return parsed.success ? parsed.data : checking;
};

// A new check keeps the version the last one reported until it reports its own.
const parseRow = (row: Row): SavedCheck =>
  row.agentVersion === null
    ? statusOf(row)
    : { ...statusOf(row), agentVersion: row.agentVersion };

const readRows = (database: Database): Row[] =>
  database
    .select({
      id: agents.id,
      status: agents.readinessStatus,
      reason: agents.readinessReason,
      agentVersion: agents.readinessAgentVersion,
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
