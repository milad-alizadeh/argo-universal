import type { PluginProjectInfo } from '@repo/contracts/plugins';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { readOriginUrl } from '@repo/git';

// How a Project's origin is read; git by default, a fake in tests that count reads.
export type ReadOrigin = (path: string) => Promise<string | null>;

// Give Plugins generic Project identity and origin metadata without Tracker rules.
export async function readPluginProjects(
  database: Database,
  readOrigin: ReadOrigin = readOriginUrl,
): Promise<PluginProjectInfo[]> {
  const projects = database
    .select({ id: project.id, path: project.path, name: project.name })
    .from(project)
    .all();

  return Promise.all(
    projects.map(async ({ id, name, path }) => ({
      id,
      name,
      originUrl: await originOf(database, { id, path }, readOrigin),
    })),
  );
}

// The registered Projects' ids, from the database alone: a registration check needs no origin and so no git.
export function readPluginProjectIds(database: Database): string[] {
  return database
    .select({ id: project.id })
    .from(project)
    .all()
    .map(({ id }) => id);
}

const origins = new WeakMap<Database, Map<string, Promise<string | null>>>();

// One in-flight or settled read per Project, so concurrent reads share a single git process.
function originOf(
  database: Database,
  { id, path }: { id: string; path: string },
  readOrigin: ReadOrigin,
): Promise<string | null> {
  const kept = origins.get(database) ?? new Map();
  const key = `${id}\0${path}`;
  const known = kept.get(key);

  if (known) return known;

  const reading = readOrigin(path).catch(() => null);

  kept.set(key, reading);
  origins.set(database, kept);

  return reading;
}

// Registered Projects changed, so each origin is read again the next time it is asked for.
export function forgetProjectOrigins(database: Database): void {
  origins.delete(database);
}
