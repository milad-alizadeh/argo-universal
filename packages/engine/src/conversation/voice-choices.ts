import type {
  CustomVoice,
  CustomVoiceInput,
  ConversationOptions,
  ConversationOptionsChange,
  VoiceList,
  VoicePreviewClipInput,
  ConversationSettings,
  ConversationSettingsChange,
} from '@repo/contracts';
import type {
  StoredConversationSettings,
  ConversationSettingsStore,
} from './conversation-settings';
import {
  deletedCustomVoice,
  listedVoices,
  previewedConversation,
  savedCustomVoices,
  type PreviewedVoice,
} from './custom-voices';
import type { ConversationSetup, ConversationProvider } from './provider';
import {
  changedSettings,
  settingsOf,
  setupOf,
  voicesOf,
} from './voice-choice-rules';

export { settingsOf } from './voice-choice-rules';

// What Operations read and change about the next call: its voice, the person's custom voices, and its instructions.
export interface VoiceChoicesPort {
  settings: () => Promise<ConversationSettings>;
  change: (change: ConversationSettingsChange) => Promise<ConversationSettings>;
  voices: () => Promise<VoiceList>;
  saveCustomVoice: (input: CustomVoiceInput) => Promise<CustomVoice>;
  deleteCustomVoice: (id: string) => Promise<VoiceList>;
  setInstructions: (instructions: string) => Promise<ConversationSettings>;
  setCallOptions: (
    change: ConversationOptionsChange,
  ) => Promise<ConversationSettings>;
}

// The person's Conversation settings against the Server's provider: read, changed, and heard when they change.
export class VoiceChoices implements VoiceChoicesPort {
  private readonly listeners = new Set<() => void>();

  public constructor(
    private readonly store: ConversationSettingsStore,
    private readonly provider: () => ConversationProvider | null,
  ) {}

  public listen(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  public enabled(): boolean {
    return this.store.read().enabled;
  }

  public settings(): Promise<ConversationSettings> {
    return settingsOf(this.store.read(), this.provider());
  }

  public async change(
    change: ConversationSettingsChange,
  ): Promise<ConversationSettings> {
    const stored = this.store.read();
    await this.keep(await changedSettings(stored, change, this.provider()));

    return this.settings();
  }

  public async voices(): Promise<VoiceList> {
    const builtIn = await voicesOf(this.provider());

    return { voices: listedVoices(builtIn, this.store.read().customVoices) };
  }

  public async saveCustomVoice(input: CustomVoiceInput): Promise<CustomVoice> {
    const builtIn = await voicesOf(this.provider());
    const stored = this.store.read();

    const { saved, custom } = savedCustomVoices(
      stored.customVoices,
      input,
      builtIn,
    );

    await this.keep({ ...stored, customVoices: custom });

    return saved;
  }

  // A deleted voice that was chosen is chosen no longer.
  public async deleteCustomVoice(id: string): Promise<VoiceList> {
    const stored = this.store.read();
    const customVoices = deletedCustomVoice(stored.customVoices, id);
    const voice = stored.voice === id ? null : stored.voice;
    await this.keep({ ...stored, customVoices, voice });

    return this.voices();
  }

  public async setInstructions(
    instructions: string,
  ): Promise<ConversationSettings> {
    await this.keep({ ...this.store.read(), instructions });

    return this.settings();
  }

  public async setCallOptions(
    change: ConversationOptionsChange,
  ): Promise<ConversationSettings> {
    const stored = this.store.read();
    await this.keep({ ...stored, options: { ...stored.options, ...change } });

    return this.settings();
  }

  public options(): ConversationOptions {
    return this.store.read().options;
  }

  // The voice a preview plays, refused when it is not there.
  public async previewed(
    input: VoicePreviewClipInput,
  ): Promise<PreviewedVoice> {
    const builtIn = await voicesOf(this.provider());

    return previewedConversation(
      input,
      this.store.read().customVoices,
      builtIn,
    );
  }

  // What the next call speaks with and is told.
  public async setup(): Promise<ConversationSetup> {
    const builtIn = await voicesOf(this.provider());

    return setupOf(this.store.read(), builtIn);
  }

  private async keep(stored: StoredConversationSettings): Promise<void> {
    await this.store.write(stored);

    for (const listener of this.listeners) listener();
  }
}
