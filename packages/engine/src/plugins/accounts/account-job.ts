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
import { hasAccount, hasProject } from './account-records';

export type AccountChange =
  | { action: 'add'; account: PluginAccount }
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

type Commits = {
  [Name in Action]: (
    transaction: StorageTransaction,
    change: ChangeOf<Name>,
  ) => void;
};

const commits: Commits = {
  add: (transaction, { account }) => {
    transaction.insert(pluginAccount).values(account).run();
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
  choose: (transaction, { projectId, host, account }) => {
    if (!hasAccount(transaction, host, account)) return;

    if (!hasProject(transaction, projectId)) return;
    transaction
      .insert(projectAccount)
      .values({ projectId, host, account })
      .onConflictDoUpdate({ target: choiceKey, set: { account } })
      .run();
  },
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
