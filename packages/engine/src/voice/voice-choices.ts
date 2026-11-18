import type {
  VoiceOption,
  VoiceProviderOption,
  VoiceSettings,
  VoiceSettingsChange,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { VoiceProvider } from './provider';
import type { StoredVoiceSettings, VoiceSettingsStore } from './voice-settings';

const noChoices: Omit<VoiceSettings, 'enabled'> = {
  provider: null,
  voice: null,
  providers: [],
  voices: [],
};

const firstVoice = (voices: VoiceOption[]): string | null =>
  voices[0]?.id ?? null;

// A stored voice the provider still lists, else the provider's first.
const voiceChosen = (
  stored: string | null,
  voices: VoiceOption[],
): string | null =>
  voices.find(({ id }) => id === stored)?.id ?? firstVoice(voices);

const optionOf = async (
  provider: VoiceProvider,
): Promise<VoiceProviderOption> => ({
  id: provider.id,
  label: provider.label,
  experimental: provider.experimental,
  availability: await provider.availability(),
});

async function offered(
  stored: StoredVoiceSettings,
  provider: VoiceProvider,
): Promise<Omit<VoiceSettings, 'enabled'>> {
  const voices = await provider.voices();

  return {
    provider: provider.id,
    voice: voiceChosen(stored.voice, voices),
    providers: [await optionOf(provider)],
    voices,
  };
}

// The settings as the person sees them: what is stored, narrowed to what the Server's provider offers.
async function settingsOf(
  stored: StoredVoiceSettings,
  provider: VoiceProvider | null,
): Promise<VoiceSettings> {
  const choices = provider ? await offered(stored, provider) : noChoices;

  return { enabled: stored.enabled, ...choices };
}

const refuse = (message: string): TRPCError =>
  new TRPCError({ code: 'BAD_REQUEST', message });

const listed = (id: string, provider: VoiceProvider | null): boolean =>
  id === provider?.id;

function requireProvider(
  id: string | undefined,
  provider: VoiceProvider | null,
): void {
  if (id !== undefined && !listed(id, provider))
    throw refuse(`There is no Voice provider ${id}`);
}

const voicesOf = async (
  provider: VoiceProvider | null,
): Promise<VoiceOption[]> => (await provider?.voices()) ?? [];

async function requireVoice(
  id: string | undefined,
  provider: VoiceProvider | null,
): Promise<void> {
  if (id === undefined) return;

  if (!(await voicesOf(provider)).some((voice) => voice.id === id))
    throw refuse(`There is no voice ${id}`);
}

const kept = (
  stored: StoredVoiceSettings,
  change: VoiceSettingsChange,
): Pick<StoredVoiceSettings, 'enabled' | 'voice'> => ({
  enabled: change.enabled ?? stored.enabled,
  voice: change.voice ?? stored.voice,
});

// What is stored once the change is applied; a choice the Server does not list is refused.
async function changedSettings(
  stored: StoredVoiceSettings,
  change: VoiceSettingsChange,
  provider: VoiceProvider | null,
): Promise<StoredVoiceSettings> {
  requireProvider(change.provider, provider);
  await requireVoice(change.voice, provider);

  return { ...kept(stored, change), provider: provider?.id ?? null };
}

// The person's Voice settings against the Server's provider: read, changed, and heard when they change.
export class VoiceChoices {
  private readonly listeners = new Set<() => void>();

  public constructor(
    private readonly store: VoiceSettingsStore,
    private readonly provider: () => VoiceProvider | null,
  ) {}

  public listen(listener: () => void): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  public enabled(): boolean {
    return this.store.read().enabled;
  }

  public settings(): Promise<VoiceSettings> {
    return settingsOf(this.store.read(), this.provider());
  }

  public async change(change: VoiceSettingsChange): Promise<VoiceSettings> {
    const stored = this.store.read();
    await this.store.write(
      await changedSettings(stored, change, this.provider()),
    );

    for (const listener of this.listeners) listener();

    return this.settings();
  }

  // The voice the next call speaks with: the one chosen, else the provider's first.
  public async voice(): Promise<string | undefined> {
    const voices = await voicesOf(this.provider());

    return voiceChosen(this.store.read().voice, voices) ?? undefined;
  }
}
