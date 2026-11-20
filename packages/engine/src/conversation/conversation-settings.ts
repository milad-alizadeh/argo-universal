import {
  CustomVoice,
  defaultVoiceCallOptions,
  VoiceCallOptionsChange,
  type VoiceCallOptions,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { serverSettings } from '@repo/db/schema';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
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
  // A built-in voice's id or a custom voice's.
  voice: string | null;
  customVoices: CustomVoice[];
  // What every call is told after Argo's own instructions; empty for none.
  instructions: string;
  options: VoiceCallOptions;
}

// What a Server that was never set up holds: Voice calls on, nothing chosen.
export const defaultVoiceSettings: StoredVoiceSettings = {
  enabled: true,
  provider: null,
  voice: null,
  customVoices: [],
  instructions: '',
  options: defaultVoiceCallOptions,
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
  customVoices: storedCustomVoices.parse(row.voiceCustomVoices),
  instructions: row.voiceInstructions,
  options: {
    ...defaultVoiceCallOptions,
    ...storedOptions.parse(row.voiceCallOptions),
  },
});

const storedCustomVoices = z.array(CustomVoice);

const optionRejections = createRejectionCounter('Stored Voice call options');

/*
 * Options kept by an older Server may be fewer, or name one Argo no longer offers; the defaults fill in the rest.
 * Options it cannot read are reported and counted, and the defaults stand in for all of them.
 */
const storedOptions = z
  .object(VoiceCallOptionsChange.shape)
  .catch(({ error }) => {
    optionRejections.report(
      'unreadable options, using the defaults',
      error.issues,
    );

    return {};
  });

const rowOf = (
  settings: StoredVoiceSettings,
): typeof serverSettings.$inferInsert => ({
  singleton: 1,
  voiceCalls: settings.enabled,
  voiceProvider: settings.provider,
  voiceName: settings.voice,
  voiceCustomVoices: settings.customVoices,
  voiceInstructions: settings.instructions,
  voiceCallOptions: settings.options,
});

class VoiceSettingsJob implements WriterJob {
  public constructor(private readonly settings: StoredVoiceSettings) {}

  public describe(): string {
    return 'change the Voice settings';
  }

  public commit(transaction: StorageTransaction): void {
    const row = rowOf(this.settings);

    transaction
      .insert(serverSettings)
      .values(row)
      .onConflictDoUpdate({ target: serverSettings.singleton, set: row })
      .run();
  }
}
