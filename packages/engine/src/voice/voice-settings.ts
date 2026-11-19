import type { Database } from '@repo/db';
import { serverSettings } from '@repo/db/schema';
import {
  writeDatabaseJobAndWaitForCommit,
  type StorageTransaction,
  type WriterActorRef,
  type WriterJob,
} from '../storage';

// What the person chose in Settings › Voice; `null` is not chosen yet, when the provider's own default applies.
export interface StoredVoiceSettings {
  enabled: boolean;
  provider: string | null;
  voice: string | null;
}

// What a Server that was never set up holds: Voice calls on, nothing chosen.
export const defaultVoiceSettings: StoredVoiceSettings = {
  enabled: true,
  provider: null,
  voice: null,
};

// Where the Voice settings are kept: the Server's own settings, so every Device reads the same answer.
export class VoiceSettingsStore {
  public constructor(
    private readonly database: Database,
    private readonly writer: WriterActorRef,
  ) {}

  public read(): StoredVoiceSettings {
    const row = this.database.select().from(serverSettings).get();

    return row ? storedOf(row) : defaultVoiceSettings;
  }

  public write(settings: StoredVoiceSettings): Promise<void> {
    return writeDatabaseJobAndWaitForCommit(
      this.writer,
      new VoiceSettingsJob(settings),
    );
  }
}

const storedOf = (
  row: typeof serverSettings.$inferSelect,
): StoredVoiceSettings => ({
  enabled: row.voiceCalls,
  provider: row.voiceProvider,
  voice: row.voiceName,
});

class VoiceSettingsJob implements WriterJob {
  public constructor(private readonly settings: StoredVoiceSettings) {}

  public describe(): string {
    return 'change the Voice settings';
  }

  public commit(transaction: StorageTransaction): void {
    const { enabled, provider, voice } = this.settings;

    const row = {
      singleton: 1,
      voiceCalls: enabled,
      voiceProvider: provider,
      voiceName: voice,
    };

    transaction
      .insert(serverSettings)
      .values(row)
      .onConflictDoUpdate({ target: serverSettings.singleton, set: row })
      .run();
  }
}
