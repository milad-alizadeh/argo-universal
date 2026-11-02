import type {
  AccountChoice,
  PluginAccount,
} from '@repo/contracts/plugins/accounts';
import type { Database } from '@repo/db';
import { pluginAccount, project, projectAccount } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { CapabilityRefusal } from '../access/capability-refusal';

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

type AccountFields = Omit<PluginAccount, 'id'>;

const sameFields = ({
  host,
  providedBy,
  label,
}: AccountFields): ReturnType<typeof and> =>
  and(
    eq(pluginAccount.host, host),
    eq(pluginAccount.providedBy, providedBy),
    eq(pluginAccount.label, label),
  );

// One row per host, providing Plugin and label: a label names one person (ADR-0036).
export function sameAccount(
  database: AccountDatabase,
  fields: AccountFields,
): PluginAccount | undefined {
  return database.select().from(pluginAccount).where(sameFields(fields)).get();
}

const choiceOf = (host: string, projectId: string): ReturnType<typeof and> =>
  and(eq(projectAccount.projectId, projectId), eq(projectAccount.host, host));

export function projectChoice(
  database: AccountDatabase,
  host: string,
  projectId: string,
): AccountChoice | undefined {
  return database
    .select()
    .from(projectAccount)
    .where(choiceOf(host, projectId))
    .get();
}

export const chosenAccount = (
  accounts: PluginAccount[],
  id: string,
): PluginAccount | null =>
  accounts.find((account) => account.id === id) ?? null;

// With no Project there is no choice to read. Signing in cannot settle several, so this is a refusal and not `no-account`.
export function onlyAccount(
  accounts: PluginAccount[],
  host: string,
): PluginAccount | null {
  const [only, another] = accounts;

  if (another)
    throw new CapabilityRefusal(
      `Several ${host} Accounts are signed in and this call has no Project. Name one with \`projectId\`.`,
    );

  return only ?? null;
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
