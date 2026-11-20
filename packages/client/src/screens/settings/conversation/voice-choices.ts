import type {
  CustomVoice,
  VoiceOption,
  ConversationSettings,
} from '@repo/contracts';

// One row of the Voice popover: a voice to choose, hear and, when it is the person's own, edit.
export interface VoiceChoice {
  id: string;
  label: string;
  subtitle?: string;
  // The custom voice the row edits; absent on a provider's voice.
  custom?: CustomVoice;
}

// What the Voice popover lists for a search: the person's voices, then the provider's under its name.
export interface VoiceChoices {
  custom: VoiceChoice[];
  builtIn: VoiceChoice[];
  builtInTitle: string;
}

const labelOf = (voices: VoiceOption[], id: string): string =>
  voices.find((voice) => voice.id === id)?.label ?? id;

// How it speaks, then the voice it speaks with, as Paper's "2 · Picker" draws it.
const customChoice = (
  voice: CustomVoice,
  voices: VoiceOption[],
): VoiceChoice => ({
  id: voice.id,
  label: voice.label,
  subtitle: `${voice.description} · ${labelOf(voices, voice.baseVoice)}`,
  custom: voice,
});

const builtInChoice = (voice: VoiceOption): VoiceChoice => ({
  id: voice.id,
  label: voice.label,
  subtitle: voice.description,
});

const matches =
  (query: string) =>
  (choice: VoiceChoice): boolean =>
    `${choice.label} ${choice.subtitle ?? ''}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());

const providerLabel = (settings: ConversationSettings): string =>
  settings.providers.find(({ id }) => id === settings.provider)?.label ??
  'Provider';

// The voices to choose from that match the search, by name or by description.
export function voiceChoices(
  settings: ConversationSettings,
  query: string,
): VoiceChoices {
  const shown = matches(query);

  return {
    custom: settings.customVoices
      .map((voice) => customChoice(voice, settings.voices))
      .filter(shown),
    builtIn: settings.voices.map(builtInChoice).filter(shown),
    builtInTitle: `${providerLabel(settings)} voices`,
  };
}

// The chosen voice's name, a custom one's own; nothing while none is chosen or it is gone.
export function chosenVoiceLabel(settings: ConversationSettings): string {
  const all = [...settings.customVoices, ...settings.voices];

  return all.find(({ id }) => id === settings.voice)?.label ?? '';
}
