import {
  PluginStateRecord,
  type PluginSettingValue,
} from '@repo/contracts/plugins';
import type { Database } from '@repo/db';
import { pluginState } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { StorageTransaction, WriterJob } from '../../storage';

export type PluginState = {
  enabled: boolean;
  settings: Record<string, PluginSettingValue>;
};

// A Plugin the user never changed is on, with every setting at its default (ADR-0025).
const untouched: PluginState = { enabled: true, settings: {} };

export const readPluginState = (
  database: Pick<Database, 'select'>,
  pluginId: string,
): PluginState => {
  const row = database
    .select()
    .from(pluginState)
    .where(eq(pluginState.id, pluginId))
    .get();

  if (!row) return untouched;

  const { enabled, settings } = PluginStateRecord.parse(row);

  return { enabled, settings };
};

type PluginStateChange =
  | { enabled: boolean }
  | { key: string; value: PluginSettingValue };

export class PluginStateJob implements WriterJob {
  public constructor(
    private readonly pluginId: string,
    private readonly change: PluginStateChange,
  ) {}

  public describe(): string {
    return describeChange(this.pluginId, this.change);
  }

  public commit(transaction: StorageTransaction): void {
    const current = readPluginState(transaction, this.pluginId);
    const row = { id: this.pluginId, ...applyChange(current, this.change) };

    transaction
      .insert(pluginState)
      .values(row)
      .onConflictDoUpdate({ target: pluginState.id, set: row })
      .run();
  }
}

function describeChange(pluginId: string, change: PluginStateChange): string {
  if (!('enabled' in change))
    return `change Plugin ${pluginId} setting ${change.key}`;

  return `turn Plugin ${pluginId} ${change.enabled ? 'on' : 'off'}`;
}

const applyChange = (
  current: PluginState,
  change: PluginStateChange,
): PluginState =>
  'enabled' in change
    ? { ...current, enabled: change.enabled }
    : {
        ...current,
        settings: { ...current.settings, [change.key]: change.value },
      };
