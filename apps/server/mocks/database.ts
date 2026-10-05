import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { project, session } from '@repo/db/schema';

// A database in a new temp directory holding `project-1` and its Session `session-1`; `remove` closes and deletes it.
export function openTestDatabase(
  sessionValues: Partial<typeof session.$inferInsert> = {},
) {
  const directory = mkdtempSync(join(tmpdir(), 'argo-server-'));
  const database = openDatabase(join(directory, 'argo.db'));
  database
    .insert(project)
    .values({ id: 'project-1', path: '/project', name: 'project' })
    .run();
  database
    .insert(session)
    .values({
      id: 'session-1',
      projectId: 'project-1',
      agent: 'mock',
      checkoutPath: '/project',
      projectionVersion: 1,
      ...sessionValues,
    })
    .run();
  return {
    database,
    remove: () => {
      database.$client.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
