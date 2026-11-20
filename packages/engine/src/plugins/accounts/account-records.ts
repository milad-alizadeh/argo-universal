import type {
  AccountChoice,
  PluginAccount,
} from '@repo/contracts/plugins/accounts';
import type { Database } from '@repo/db';
import { pluginAccount, project, projectAccount } from '@repo/db/schema';
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

// One row per host, providing Plugin and label: a label names one person, so adding them again finds their row.
export function sameAccount(
  database: AccountDatabase,
  { host, providedBy, label }: Omit<PluginAccount, 'id'>,
): PluginAccount | undefined {
  const same = and(
    eq(pluginAccount.host, host),
    eq(pluginAccount.providedBy, providedBy),
    eq(pluginAccount.label, label),
  );

  return database.select().from(pluginAccount).where(same).get();
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

export const chosenAccount = (
  accounts: PluginAccount[],
  id: string,
): PluginAccount | null =>
  accounts.find((account) => account.id === id) ?? null;

// The one Account a Plugin provides for a host, which a call with no Project gets (ADR-0036).
export function ownAccount(
  accounts: PluginAccount[],
  pluginId: string | undefined,
): PluginAccount | null {
  const own = accounts.filter((account) => account.providedBy === pluginId);

  return own.length === 1 ? (own[0] ?? null) : null;
}

// The Account a Project chose for a host, if it chose one.
export const projectChoice = (
  database: AccountDatabase,
  { host, projectId }: { host: string; projectId: string },
): AccountChoice | undefined =>
  database
    .select()
    .from(projectAccount)
    .where(
      and(
        eq(projectAccount.projectId, projectId),
        eq(projectAccount.host, host),
      ),
    )
    .get();
