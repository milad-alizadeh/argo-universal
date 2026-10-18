import type { PluginProjectInfo } from '@repo/contracts/plugins';
import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { readOriginUrl } from '@repo/git';

// Give Plugins generic Project identity and origin metadata without Tracker rules.
export async function readPluginProjects(
  database: Database,
): Promise<PluginProjectInfo[]> {
  const projects = database
    .select({ id: project.id, path: project.path, name: project.name })
    .from(project)
    .all();

  return Promise.all(
    projects.map(async ({ id, name, path }) => ({
      id,
      name,
      originUrl: await readOriginUrl(path).catch(() => null),
    })),
  );
}
