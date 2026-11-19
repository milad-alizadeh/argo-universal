import type {
  VoiceOption,
  VoiceProviderOption,
  VoiceSettings,
  VoiceSettingsChange,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { VoiceCallSetup, VoiceProvider } from './provider';
import type { StoredVoiceSettings } from './voice-settings';

type Offered = Pick<VoiceSettings, 'provider' | 'voice' | 'providers' | 'voices'>;

const noChoices: Offered = {
  provider: null,
  voice: null,
  providers: [],
  voices: [],
};

export const refuse = (message: string): TRPCError =>
  new TRPCError({ code: 'BAD_REQUEST', message });

export const voicesOf = async (
  provider: VoiceProvider | null,
): Promise<VoiceOption[]> => (await provider?.voices()) ?? [];

// Every voice the person can choose: the provider's, then their own.
const choosable = (
  stored: StoredVoiceSettings,
  builtIn: VoiceOption[],
): string[] => [
  ...builtIn.map(({ id }) => id),
  ...stored.customVoices.map(({ id }) => id),
];

const firstVoice = (voices: VoiceOption[]): string | null =>
  voices[0]?.id ?? null;

// A stored voice that is still there, else the provider's first.
const voiceChosen = (
  stored: StoredVoiceSettings,
  builtIn: VoiceOption[],
): string | null =>
  choosable(stored, builtIn).find((id) => id === stored.voice) ??
  firstVoice(builtIn);

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
): Promise<Offered> {
  const voices = await provider.voices();

  return {
    provider: provider.id,
    voice: voiceChosen(stored, voices),
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
  const { enabled, customVoices, instructions } = stored;

  return { enabled, ...choices, customVoices, instructions };
}

const unless = (text: string): string | undefined => text || undefined;

/*
 * What the next call is set up with: a built-in voice, and, for a custom voice, how it speaks. Left out, the provider's
 * own default applies.
 */
export function setupOf(
  stored: StoredVoiceSettings,
  builtIn: VoiceOption[],
): VoiceCallSetup {
  const chosen = voiceChosen(stored, builtIn);
  const custom = stored.customVoices.find(({ id }) => id === chosen);
  const instructions = unless(stored.instructions);

  return custom
    ? { voice: custom.baseVoice, style: custom.description, instructions }
    : { voice: chosen ?? undefined, instructions };
}

const listed = (id: string, provider: VoiceProvider | null): boolean =>
  id === provider?.id;

function requireProvider(
  id: string | undefined,
  provider: VoiceProvider | null,
): void {
  if (id !== undefined && !listed(id, provider))
    throw refuse(`There is no Voice provider ${id}`);
}

function requireVoice(
  id: string | undefined,
  stored: StoredVoiceSettings,
  builtIn: VoiceOption[],
): void {
  if (id !== undefined && !choosable(stored, builtIn).includes(id))
    throw refuse(`There is no voice ${id}`);
}

// What is stored once the change is applied; a choice the Server does not list is refused.
export async function changedSettings(
  stored: StoredVoiceSettings,
  change: VoiceSettingsChange,
  provider: VoiceProvider | null,
): Promise<StoredVoiceSettings> {
  requireProvider(change.provider, provider);
  requireVoice(change.voice, stored, await voicesOf(provider));

  return { ...kept(stored, change), provider: provider?.id ?? null };
}

const kept = (
  stored: StoredVoiceSettings,
  change: VoiceSettingsChange,
): StoredVoiceSettings => ({
  ...stored,
  enabled: change.enabled ?? stored.enabled,
  voice: change.voice ?? stored.voice,
});
