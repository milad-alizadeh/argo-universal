import { InstallationOwner } from '@repo/contracts';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// What the Resolver last saved for an Agent; `observed` is false until it has looked once.
export type InstallationObservation =
  | { observed: false }
  | { observed: true; found: false }
  | {
      observed: true;
      found: true;
      owner: InstallationOwner;
      // The launch file it found.
      executable: string;
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
  const executable = launchExecutable(row.launch);

  return { observed: true, found: true, owner, executable, ...versionOf(row) };
};

const SavedLaunch = z.object({ executable: z.string() });

// A saved launch that cannot be read names no file.
const launchExecutable = (text: string): string => {
  try {
    return SavedLaunch.parse(JSON.parse(text)).executable;
  } catch {
    return '';
  }
};

const versionOf = ({ version }: Row): { version?: string } =>
  version === null ? {} : { version };

const observationColumns = {
  id: agents.id,
  launch: agents.installationLaunch,
  owner: agents.installationOwner,
  version: agents.installationVersion,
  observedAt: agents.installationObservedAt,
};

type InstallationFound = { found: boolean };

// Whether the Resolver's last saved look found this Agent.
export const readInstallationObservation = (
  database: Database,
  agentId: string,
): InstallationFound => {
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
  const rows = database.select(observationColumns).from(agents).all();
  const observations = new Map(rows.map((row) => [row.id, parseRow(row)]));

  return (agentId) => observations.get(agentId) ?? { observed: false };
};
