import type {
  VoiceOption,
  VoiceProviderOption,
  VoiceSettings,
  VoiceSettingsChange,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { VoiceProvider } from './provider';
import type { StoredVoiceSettings } from './voice-settings';

const noChoices: Omit<VoiceSettings, 'enabled'> = {
  provider: null,
  voice: null,
  providers: [],
  voices: [],
};

const firstVoice = (voices: VoiceOption[]): string | null =>
  voices[0]?.id ?? null;

// A stored voice the provider still lists, else the provider's first.
export const voiceChosen = (
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
export async function settingsOf(
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

const voicesOf = async (provider: VoiceProvider | null): Promise<VoiceOption[]> =>
  (await provider?.voices()) ?? [];

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
export async function changedSettings(
  stored: StoredVoiceSettings,
  change: VoiceSettingsChange,
  provider: VoiceProvider | null,
): Promise<StoredVoiceSettings> {
  requireProvider(change.provider, provider);
  await requireVoice(change.voice, provider);

  return { ...kept(stored, change), provider: provider?.id ?? null };
}
