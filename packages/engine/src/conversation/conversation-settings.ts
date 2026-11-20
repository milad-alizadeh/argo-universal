import {
  CustomVoice,
  defaultConversationOptions,
  ConversationOptionsChange,
  type ConversationOptions,
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

// What the person chose in Settings › Conversation; `null` is not chosen yet, when the provider's own default applies.
export interface StoredConversationSettings {
  enabled: boolean;
  provider: string | null;
  // A built-in voice's id or a custom voice's.
  voice: string | null;
  customVoices: CustomVoice[];
  // What every call is told after Argo's own instructions; empty for none.
  instructions: string;
  options: ConversationOptions;
}

// What a Server that was never set up holds: Conversations on, nothing chosen.
export const defaultConversationSettings: StoredConversationSettings = {
  enabled: true,
  provider: null,
  voice: null,
  customVoices: [],
  instructions: '',
  options: defaultConversationOptions,
};

// Where the Conversation settings are kept: the Server's own settings, so every Device reads the same answer.
export class ConversationSettingsStore {
  public constructor(
    private readonly database: Database,
    private readonly writer: WriterActorRef,
  ) {}

  public read(): StoredConversationSettings {
    const row = this.database.select().from(serverSettings).get();

    return row ? storedOf(row) : defaultConversationSettings;
  }

  public write(settings: StoredConversationSettings): Promise<void> {
    return writeDatabaseJobAndWaitForCommit(
      this.writer,
      new ConversationSettingsJob(settings),
    );
  }
}

const storedOf = (
  row: typeof serverSettings.$inferSelect,
): StoredConversationSettings => ({
  enabled: row.conversations,
  provider: row.conversationProvider,
  voice: row.voiceName,
  customVoices: storedCustomVoices.parse(row.voiceCustomVoices),
  instructions: row.conversationInstructions,
  options: {
    ...defaultConversationOptions,
    ...storedOptions.parse(row.conversationOptions),
  },
});

const storedCustomVoices = z.array(CustomVoice);

const optionRejections = createRejectionCounter('Stored Conversation options');

/*
 * Options kept by an older Server may be fewer, or name one Argo no longer offers; the defaults fill in the rest.
 * Options it cannot read are reported and counted, and the defaults stand in for all of them.
 */
const storedOptions = z
  .object(ConversationOptionsChange.shape)
  .catch(({ error }) => {
    optionRejections.report(
      'unreadable options, using the defaults',
      error.issues,
    );

    return {};
  });

const rowOf = (
  settings: StoredConversationSettings,
): typeof serverSettings.$inferInsert => ({
  singleton: 1,
  conversations: settings.enabled,
  conversationProvider: settings.provider,
  voiceName: settings.voice,
  voiceCustomVoices: settings.customVoices,
  conversationInstructions: settings.instructions,
  conversationOptions: settings.options,
});

class ConversationSettingsJob implements WriterJob {
  public constructor(private readonly settings: StoredConversationSettings) {}

  public describe(): string {
    return 'change the Conversation settings';
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
