import { randomUUID } from 'node:crypto';
import type { PluginManifest } from '@repo/contracts/plugins';
import {
  PluginAccount,
  PluginAccountGrant,
  type AccountChoice,
} from '@repo/contracts/plugins/accounts';
import type { Database } from '@repo/db';
import {
  pluginAccount,
  pluginAccountGrant,
  projectAccount,
} from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../../storage';
import { pluginKeychainService, type Keychain } from '../services/keychain';
import { AccountJob, type AccountChange } from './account-job';

type Dependencies = {
  database: Database;
  databaseWriter: WriterActorRef;
  keychain: Keychain;
  manifest: (pluginId: string) => Promise<PluginManifest>;
  firstParty: (pluginId: string) => Promise<boolean>;
};

// Durable inventory and Grants. Tokens remain in the providing Plugin's Keychain namespace.
export class PluginAccounts {
  constructor(private readonly deps: Dependencies) {}

  list(): PluginAccount[] {
    return this.deps.database
      .select()
      .from(pluginAccount)
      .all()
      .map((row) => PluginAccount.parse(row));
  }

  grants(id?: string): PluginAccountGrant[] {
    return this.deps.database
      .select()
      .from(pluginAccountGrant)
      .where(id === undefined ? undefined : eq(pluginAccountGrant.account, id))
      .all()
      .map((row) => PluginAccountGrant.parse(row));
  }

  async requireProvider(pluginId: string, host: string): Promise<void> {
    const manifest = await this.deps.manifest(pluginId);

    if (
      !manifest.contributes.accounts?.some((account) => account.host === host)
    )
      throw new Error(
        `Plugin ${pluginId} does not provide Accounts for ${host}`,
      );
  }

  async add(pluginId: string, host: string, label: string): Promise<string> {
    await this.requireProvider(pluginId, host);
    const id = randomUUID();
    await this.write({
      action: 'add',
      account: { id, host, label, providedBy: pluginId },
    });

    return id;
  }

  async get(host: string, projectId?: string): Promise<PluginAccount | null> {
    if (!projectId) return null;

    const accounts = this.list().filter((account) => account.host === host);
    const chosen = this.choice(host, projectId);

    if (chosen) return chosenAccount(accounts, chosen.account);

    return this.chooseOnly(accounts, projectId);
  }

  private choice(host: string, projectId: string): AccountChoice | undefined {
    return this.deps.database
      .select()
      .from(projectAccount)
      .where(
        and(
          eq(projectAccount.projectId, projectId),
          eq(projectAccount.host, host),
        ),
      )
      .get();
  }

  private async chooseOnly(
    accounts: PluginAccount[],
    projectId: string,
  ): Promise<PluginAccount | null> {
    if (accounts.length !== 1) return null;
    const [only] = accounts;

    if (!only) return null;
    await this.choose({ host: only.host, projectId, account: only.id });

    return only;
  }

  async choose(choice: AccountChoice): Promise<void> {
    const account = this.list().find(
      ({ id, host }) => id === choice.account && host === choice.host,
    );

    if (!account) throw new Error('Account is unavailable');
    await this.write({ action: 'choose', ...choice });
  }

  async allowed(account: PluginAccount, plugin: string): Promise<boolean> {
    const grant = this.grants(account.id).find((row) => row.plugin === plugin);

    if (grant) return grant.allowed;

    if (!(await this.deps.firstParty(plugin))) return false;
    await this.write({
      action: 'defaultGrant',
      grant: { host: account.host, account: account.id, plugin, allowed: true },
    });

    return this.grants(account.id).some(
      (row) => row.plugin === plugin && row.allowed,
    );
  }

  async grant(grant: PluginAccountGrant): Promise<void> {
    await this.deps.manifest(grant.plugin);
    await this.write({ action: 'grant', grant });
  }

  async signOut(id: string): Promise<void> {
    const account = this.list().find((row) => row.id === id);

    if (!account) return;
    await this.deps.keychain.delete(
      pluginKeychainService(account.providedBy),
      id,
    );
    await this.write({ action: 'signOut', id });
  }

  async removePlugin(pluginId: string): Promise<void> {
    for (const account of this.list().filter(
      (row) => row.providedBy === pluginId,
    ))
      await this.deps.keychain.delete(
        pluginKeychainService(pluginId),
        account.id,
      );
    await this.write({ action: 'removePlugin', pluginId });
  }

  private write(change: AccountChange): Promise<void> {
    return writeDatabaseJobAndWaitForCommit(
      this.deps.databaseWriter,
      new AccountJob(change),
      true,
    );
  }
}

const chosenAccount = (
  accounts: PluginAccount[],
  id: string,
): PluginAccount | null =>
  accounts.find((account) => account.id === id) ?? null;
