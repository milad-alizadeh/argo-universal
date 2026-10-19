import type { ChangesSummary } from '@repo/contracts';
import type { Database } from '@repo/db';
import { readCheckoutChanges } from '@repo/git';
import { readProjectPath } from '../projects';

export async function readDefaultChangesSummary(
  database: Database,
  projectId: string,
  checkout: string,
): Promise<ChangesSummary> {
  const projectCheckout = readProjectPath(database, projectId);

  const changes = await readCheckoutChanges(checkout, projectCheckout, {
    type: 'main',
  });

  return changes.summary;
}
