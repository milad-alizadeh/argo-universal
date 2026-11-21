import { createHash } from 'node:crypto';
import {
  RunSettingsEnv,
  type RunSettingsList,
  type RunSettingsResult,
  type RunSettingsUpdate,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { runSettings } from '@repo/db/schema';
import { TRPCError } from '@trpc/server';
import { and, eq, isNotNull } from 'drizzle-orm';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';
import type { RunConfiguration } from './run-configurations';
import { readRunFile, requireRunConfiguration } from './run-file';
import type { RunCheckout } from './runs';

type SettingsKey = { projectId: string; name: string };

type Patch = Partial<Omit<typeof runSettings.$inferInsert, keyof SettingsKey>>;

type StoredSettings = typeof runSettings.$inferSelect;

type SettingChange = Pick<RunSettingsUpdate, 'env' | 'port' | 'autoStart'>;

// Personal values do not change the identity of what the person launched from the Checkout.
export function configurationFingerprint({
  command,
  cwd,
  env,
}: RunConfiguration): string {
  const variables = Object.keys(env)
    .sort()
    .map((key) => [key, env[key]]);

  return createHash('sha256')
    .update(JSON.stringify([command, cwd, variables]))
    .digest('hex');
}

const readSettings = (
  database: Database | StorageTransaction,
  { projectId, name }: SettingsKey,
): StoredSettings | undefined =>
  database
    .select()
    .from(runSettings)
    .where(
      and(eq(runSettings.projectId, projectId), eq(runSettings.name, name)),
    )
    .get();

const envOf = (
  settings: StoredSettings | undefined,
): RunSettingsResult['env'] => RunSettingsEnv.parse(settings?.env ?? {});

function settingsFor(
  settings: StoredSettings | undefined,
  fingerprint: string,
): RunSettingsResult {
  const canAutoStart = settings?.trusted === fingerprint;

  return {
    env: envOf(settings),
    port: settings?.port ?? null,
    canAutoStart,
    autoStart: canAutoStart && settings.autoStart === fingerprint,
  };
}

const changesTo = (
  { env, port, autoStart }: SettingChange,
  fingerprint: string,
): Patch => ({
  ...(env !== undefined && { env }),
  ...(port !== undefined && { port }),
  ...(autoStart !== undefined && { autoStart: autoStart ? fingerprint : null }),
});

class RunSettingsWriteJob implements WriterJob {
  public accepted = false;

  public constructor(
    private readonly key: SettingsKey,
    private readonly patch: Patch,
    private readonly requiredTrust?: string,
  ) {}

  public describe(): string {
    return `change Run settings for ${this.key.name}`;
  }

  public commit(transaction: StorageTransaction): void {
    // A normal refusal must not roll back other jobs in the same writer batch.
    if (
      this.requiredTrust !== undefined &&
      readSettings(transaction, this.key)?.trusted !== this.requiredTrust
    )
      return;

    transaction
      .insert(runSettings)
      .values({ ...this.key, ...this.patch })
      .onConflictDoUpdate({
        target: [runSettings.projectId, runSettings.name],
        set: this.patch,
      })
      .run();
    this.accepted = true;
  }
}

export class RunSettingsStore {
  public constructor(
    private readonly database: Database,
    private readonly writer: WriterActorRef,
  ) {}

  public async read(
    checkout: RunCheckout,
    name: string,
  ): Promise<RunSettingsResult> {
    const configuration = await requireRunConfiguration(
      checkout.checkoutPath,
      name,
    );

    return settingsFor(
      readSettings(this.database, { projectId: checkout.projectId, name }),
      configurationFingerprint(configuration),
    );
  }

  public async list({
    projectId,
    checkoutPath,
  }: RunCheckout): Promise<RunSettingsList> {
    const { configurations } = await readRunFile(checkoutPath);

    return configurations.map((configuration) => {
      const { name } = configuration;

      return {
        name,
        ...settingsFor(
          readSettings(this.database, { projectId, name }),
          configurationFingerprint(configuration),
        ),
      };
    });
  }

  public async update(
    checkout: RunCheckout,
    { name, ...change }: SettingChange & { name: string },
  ): Promise<RunSettingsResult> {
    const configuration = await requireRunConfiguration(
      checkout.checkoutPath,
      name,
    );

    const key = { projectId: checkout.projectId, name };
    const fingerprint = configurationFingerprint(configuration);
    const patch = changesTo(change, fingerprint);

    if (Object.keys(patch).length > 0)
      await this.write(key, patch, change.autoStart ? fingerprint : undefined);

    return settingsFor(readSettings(this.database, key), fingerprint);
  }

  public recordManual(
    projectId: string,
    configuration: RunConfiguration,
  ): Promise<void> {
    return this.write(
      { projectId, name: configuration.name },
      { trusted: configurationFingerprint(configuration) },
    );
  }

  public async autoStarts(checkout: RunCheckout): Promise<RunConfiguration[]> {
    const optedIn = this.database
      .select({ name: runSettings.name, fingerprint: runSettings.autoStart })
      .from(runSettings)
      .where(
        and(
          eq(runSettings.projectId, checkout.projectId),
          isNotNull(runSettings.autoStart),
          eq(runSettings.autoStart, runSettings.trusted),
        ),
      )
      .all();

    if (optedIn.length === 0) return [];

    const fingerprints = new Map(
      optedIn.map(({ name, fingerprint }) => [name, fingerprint]),
    );

    const { configurations } = await readRunFile(checkout.checkoutPath);

    return configurations.filter(
      (configuration) =>
        fingerprints.get(configuration.name) ===
        configurationFingerprint(configuration),
    );
  }

  public requireAutoStart(key: SettingsKey, fingerprint: string): void {
    const selected = readSettings(this.database, key);

    if (selected?.autoStart !== fingerprint || selected.trusted !== fingerprint)
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: `Auto-start is off for Run Configuration "${key.name}".`,
      });
  }

  public effective(
    projectId: string,
    configuration: RunConfiguration,
  ): RunConfiguration {
    const selected = readSettings(this.database, {
      projectId,
      name: configuration.name,
    });

    if (!selected) return configuration;

    return {
      ...configuration,
      env: { ...configuration.env, ...envOf(selected) },
      port: selected.port ?? configuration.port,
    };
  }

  private async write(
    key: SettingsKey,
    patch: Patch,
    requiredTrust?: string,
  ): Promise<void> {
    const job = new RunSettingsWriteJob(key, patch, requiredTrust);
    await writeDatabaseJobAndWaitForCommit(this.writer, job);

    if (!job.accepted)
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message:
          'Start this Run Configuration yourself before turning on auto-start.',
      });
  }
}
