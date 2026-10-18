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
} from '../storage';
import { pluginSettingsKeychainService, type Keychain } from './keychain';
import { readPluginState, PluginStateJob } from './plugin-state';

export type PluginSettingsDeps = {
  database: Database;
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

type Stored = Record<string, PluginSettingValue>;

type PlainField = Exclude<PluginSettingField, { type: 'secret' }>;

// A toggle with no default is off; a text or picker with none is unset.
const defaultOf = (field: PlainField): PluginSettingValue | undefined =>
  field.type === 'toggle' ? (field.default ?? false) : field.default;

const valueOf = (
  field: PlainField,
  stored: Stored,
): PluginSettingValue | undefined => stored[field.key] ?? defaultOf(field);

// A secret's value never leaves the Server, so the App gets only whether it is set.
function storedEntry(
  field: PluginSettingField,
  stored: Stored,
): [string, PluginSettingValue][] {
  if (field.type === 'secret') return [];

  const value = valueOf(field, stored);

  return value === undefined ? [] : [[field.key, value]];
}

function check(field: PluginSettingField, value: PluginSettingValue): void {
  if (field.type === 'toggle') return checkToggle(field.key, value);

  checkText(field, value);
}

function checkToggle(key: string, value: PluginSettingValue): void {
  if (typeof value !== 'boolean') throw new Error(`${key} takes on or off`);
}

function checkText(field: PluginSettingField, value: PluginSettingValue): void {
  if (typeof value !== 'string') throw new Error(`${field.key} takes text`);

  if (field.type === 'picker') checkOption(field, value);
}

function checkOption(
  field: Extract<PluginSettingField, { type: 'picker' }>,
  value: string,
): void {
  if (!field.options.some((option) => option.value === value))
    throw new Error(`${value} is not an option of ${field.key}`);
}
