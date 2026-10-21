import type { AccountChoice } from '@repo/contracts/plugins/accounts';
import type { Database } from '@repo/db';
import { pluginAccount, project } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';

type AccountDatabase = Pick<Database, 'select'>;

export function hasAccount(
  database: AccountDatabase,
  host: string,
  account: string,
): boolean {
  return (
    database
      .select({ id: pluginAccount.id })
      .from(pluginAccount)
      .where(and(eq(pluginAccount.id, account), eq(pluginAccount.host, host)))
      .get() !== undefined
  );
}

export function hasProject(
  database: AccountDatabase,
  projectId: string,
): boolean {
  return (
    database
      .select({ id: project.id })
      .from(project)
      .where(eq(project.id, projectId))
      .get() !== undefined
  );
}

export function requireAccount(
  database: AccountDatabase,
  host: string,
  account: string,
): void {
  if (!hasAccount(database, host, account))
    throw new Error('Account is unavailable');
}

export function requireChoice(
  database: AccountDatabase,
  choice: AccountChoice,
): void {
  requireAccount(database, choice.host, choice.account);

  if (!hasProject(database, choice.projectId))
    throw new Error('Project is unavailable');
}
