import { InstallationOwner } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';

// What the Resolver last saved for an Agent; `observed` is false until it has looked once.
export type InstallationObservation =
  | { observed: false }
  | { observed: true; found: false }
  | {
      observed: true;
      found: true;
      owner: InstallationOwner;
      version?: string;
    };

type Row = {
  id: string;
  launch: string | null;
  owner: string | null;
  version: string | null;
  observedAt: number | null;
};
const parseRow = (row: Row): InstallationObservation => {
  if (row.observedAt === null) return { observed: false };
  if (row.launch === null) return { observed: true, found: false };
  const owner = InstallationOwner.catch('unknown').parse(row.owner);
  return {
    observed: true,
    found: true,
    owner,
    ...(row.version === null ? {} : { version: row.version }),
  };
};

const observationColumns = {
  id: agents.id,
  launch: agents.installationLaunch,
  owner: agents.installationOwner,
  version: agents.installationVersion,
  observedAt: agents.installationObservedAt,
};

// Whether the Resolver's last saved look found this Agent.
export const readInstallationObservation = (
  database: Database,
  agentId: string,
): { found: boolean } => {
  const row = database
    .select(observationColumns)
    .from(agents)
    .where(eq(agents.id, agentId))
    .get();
  const observation = row ? parseRow(row) : { observed: false as const };
  return { found: observation.observed && observation.found };
};

export const readInstallationObservations = (
  database: Database,
): ((agentId: string) => InstallationObservation) => {
  const rows = database
    .select(observationColumns)
    .from(agents)
    .all();
  const observations = new Map(rows.map((row) => [row.id, parseRow(row)]));
  return (agentId) => observations.get(agentId) ?? { observed: false };
};
