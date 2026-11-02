import type {
  PluginAccount,
  PluginAccountGrant,
  AccountChoice,
} from '@repo/contracts/plugins/accounts';
import {
  pluginAccount,
  pluginAccountGrant,
  projectAccount,
} from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';
import { hasAccount, hasProject, sameAccount } from './account-records';

export type AccountChange =
  | { action: 'save'; account: PluginAccount; projectId?: string }
  | { action: 'grant'; grant: PluginAccountGrant }
  | { action: 'defaultGrant'; grant: PluginAccountGrant }
  | ({ action: 'choose' } & AccountChoice)
  | { action: 'signOut'; id: string }
  | { action: 'removePlugin'; pluginId: string };

type Action = AccountChange['action'];

type ChangeOf<Name extends Action> = Extract<AccountChange, { action: Name }>;

const grantKey = [
  pluginAccountGrant.host,
  pluginAccountGrant.account,
  pluginAccountGrant.plugin,
];

const choiceKey = [projectAccount.projectId, projectAccount.host];

// The row for this person from this Plugin when there is one, so signing in again adds none.
function savedId(
  transaction: StorageTransaction,
  account: PluginAccount,
): string {
  const saved = sameAccount(transaction, account);

  if (saved) return saved.id;
  transaction.insert(pluginAccount).values(account).run();

  return account.id;
}

function recordChoice(
  transaction: StorageTransaction,
  { projectId, host, account }: AccountChoice,
): void {
  if (!hasAccount(transaction, host, account)) return;

  if (!hasProject(transaction, projectId)) return;
  transaction
    .insert(projectAccount)
    .values({ projectId, host, account })
    .onConflictDoUpdate({ target: choiceKey, set: { account } })
    .run();
}

type Commits = {
  [Name in Action]: (
    transaction: StorageTransaction,
    change: ChangeOf<Name>,
  ) => void;
};

const commits: Commits = {
  save: (transaction, { account, projectId }) => {
    const id = savedId(transaction, account);

    if (projectId === undefined) return;
    recordChoice(transaction, { projectId, host: account.host, account: id });
  },
  grant: (transaction, { grant }) => {
    if (!hasAccount(transaction, grant.host, grant.account)) return;
    transaction
      .insert(pluginAccountGrant)
      .values(grant)
      .onConflictDoUpdate({ target: grantKey, set: { allowed: grant.allowed } })
      .run();
  },
  defaultGrant: (transaction, { grant }) => {
    if (!hasAccount(transaction, grant.host, grant.account)) return;
    transaction
      .insert(pluginAccountGrant)
      .values(grant)
      .onConflictDoNothing()
      .run();
  },
  choose: recordChoice,
  signOut: (transaction, { id }) => {
    transaction.delete(pluginAccount).where(eq(pluginAccount.id, id)).run();
  },
  removePlugin: (transaction, { pluginId }) => {
    transaction
      .delete(pluginAccountGrant)
      .where(eq(pluginAccountGrant.plugin, pluginId))
      .run();
    transaction
      .delete(pluginAccount)
      .where(eq(pluginAccount.providedBy, pluginId))
      .run();
  },
};

export class AccountJob implements WriterJob {
  constructor(private readonly change: AccountChange) {}
  describe(): string {
    return `Plugin Accounts: ${this.change.action}`;
  }
  commit(transaction: StorageTransaction): void {
    commitChange(transaction, this.change);
  }
}

const commitChange = <Name extends Action>(
  transaction: StorageTransaction,
  change: ChangeOf<Name> & { action: Name },
): void => commits[change.action](transaction, change);
