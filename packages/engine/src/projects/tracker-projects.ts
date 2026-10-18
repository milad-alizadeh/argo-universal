import type { Database } from '@repo/db';
import { project } from '@repo/db/schema';
import { readGitHubRepository } from '@repo/git';

// Expose only the identity needed to associate a Project with a GitHub Tracker.
export async function readTrackerProjects(
  database: Database,
): Promise<{ id: string; name: string; repository: string | null }[]> {
  const projects = database
    .select({ id: project.id, path: project.path, name: project.name })
    .from(project)
    .all();

  return Promise.all(
    projects.map(async ({ id, name, path }) => ({
      id,
      name,
      repository: await readGitHubRepository(path).catch(() => null),
    })),
  );
}
