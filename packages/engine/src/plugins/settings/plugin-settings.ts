import type {
  PluginManifest,
  PluginSettingField,
  PluginSettingValue,
  PluginSettings as PluginSettingsOutput,
} from '@repo/contracts/plugins';
import type { Database } from '@repo/db';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../../storage';
import type { PluginListChanges } from '../list-changes';
import {
  pluginSettingsKeychainService,
  type Keychain,
} from '../services/keychain';
import { readPluginState, PluginStateJob } from './plugin-state';
import { check, storedEntry, valueOf } from './setting-values';

export type PluginSettingsDeps = {
  database: Database;
  // Told when a Plugin is turned on or off, so every connected App reads the list again.
  listChanges: PluginListChanges;
  databaseWriter: WriterActorRef;
  keychain: Keychain;
  manifest: (pluginId: string) => Promise<PluginManifest>;
};

type Change = { pluginId: string; key: string; value: PluginSettingValue };

// The values of each Plugin's `contributes.settings`: plain values in Argo's database, secrets in the Keychain.
export class PluginSettings {
  constructor(private readonly deps: PluginSettingsDeps) {}

  async values(pluginId: string): Promise<PluginSettingsOutput> {
    const fields = await this.fields(pluginId);
    const stored = readPluginState(this.deps.database, pluginId).settings;

    return {
      values: Object.fromEntries(
        fields.flatMap((field) => storedEntry(field, stored)),
      ),
      secretsSet: await this.secretsSet(pluginId, fields),
    };
  }

  // What `argo.settings.get` answers: a secret's value too, since the Plugin is the one that uses it.
  async read(
    pluginId: string,
    key: string,
  ): Promise<PluginSettingValue | null> {
    const field = await this.field(pluginId, key);

    if (field.type === 'secret') return this.secret(pluginId, key);

    const stored = readPluginState(this.deps.database, pluginId).settings;

    return valueOf(field, stored) ?? null;
  }

  async change({ pluginId, key, value }: Change): Promise<void> {
    const field = await this.field(pluginId, key);

    check(field, value);

    if (field.type === 'secret')
      return this.changeSecret(pluginId, key, String(value));

    await writeDatabaseJobAndWaitForCommit(
      this.deps.databaseWriter,
      new PluginStateJob(pluginId, { key, value }),
      true,
    );
  }

  enabled(pluginId: string): boolean {
    return readPluginState(this.deps.database, pluginId).enabled;
  }

  async setEnabled(pluginId: string, enabled: boolean): Promise<void> {
    await writeDatabaseJobAndWaitForCommit(
      this.deps.databaseWriter,
      new PluginStateJob(pluginId, { enabled }),
      true,
    );

    this.deps.listChanges.changed(pluginId);
  }

  private async fields(pluginId: string): Promise<PluginSettingField[]> {
    return (await this.deps.manifest(pluginId)).contributes.settings ?? [];
  }

  private async field(
    pluginId: string,
    key: string,
  ): Promise<PluginSettingField> {
    const field = (await this.fields(pluginId)).find(
      (candidate) => candidate.key === key,
    );

    if (!field) throw new Error(`Plugin ${pluginId} has no setting ${key}`);

    return field;
  }

  // The keys of the secrets the Keychain holds a value for.
  private async secretsSet(
    pluginId: string,
    fields: readonly PluginSettingField[],
  ): Promise<string[]> {
    const secrets = fields.filter(({ type }) => type === 'secret');

    const values = await Promise.all(
      secrets.map(({ key }) => this.secret(pluginId, key)),
    );

    return secrets.flatMap(({ key }, index) =>
      values[index] === null ? [] : [key],
    );
  }

  private secret(pluginId: string, key: string): Promise<string | null> {
    return this.deps.keychain.get(pluginSettingsKeychainService(pluginId), key);
  }

  private changeSecret(
    pluginId: string,
    key: string,
    value: string,
  ): Promise<void> {
    const service = pluginSettingsKeychainService(pluginId);

    return value === ''
      ? this.deps.keychain.delete(service, key)
      : this.deps.keychain.set(service, key, value);
  }
}
