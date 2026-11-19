import { randomUUID } from 'node:crypto';
import type {
  CustomVoice,
  CustomVoiceInput,
  ListedVoice,
  VoiceOption,
  VoicePreviewInput,
} from '@repo/contracts';
import { baseOf, refuse } from './voice-choice-rules';

// The provider's voices, then the person's own.
export const listedVoices = (
  builtIn: VoiceOption[],
  custom: CustomVoice[],
): ListedVoice[] => [
  ...builtIn.map((voice) => ({ kind: 'builtIn' as const, ...voice })),
  ...custom.map((voice) => ({ kind: 'custom' as const, ...voice })),
];

function requireBaseVoice(baseVoice: string, builtIn: VoiceOption[]): void {
  if (!builtIn.some(({ id }) => id === baseVoice))
    throw refuse(`There is no built-in voice ${baseVoice}`);
}

function requireCustomVoice(id: string, custom: CustomVoice[]): void {
  if (!custom.some((voice) => voice.id === id))
    throw refuse(`There is no custom voice ${id}`);
}

// A custom voice being saved, and the custom voices once it is.
export interface CustomVoiceSave {
  saved: CustomVoice;
  custom: CustomVoice[];
}

const added = (custom: CustomVoice[], saved: CustomVoice): CustomVoiceSave => ({
  saved,
  custom: [...custom, saved],
});

function changed(custom: CustomVoice[], saved: CustomVoice): CustomVoiceSave {
  requireCustomVoice(saved.id, custom);

  return {
    saved,
    custom: custom.map((voice) => (voice.id === saved.id ? saved : voice)),
  };
}

// A new custom voice goes at the end; one `input` names is changed in place.
export function savedCustomVoices(
  custom: CustomVoice[],
  { id, ...input }: CustomVoiceInput,
  builtIn: VoiceOption[],
): CustomVoiceSave {
  requireBaseVoice(input.baseVoice, builtIn);

  return id === undefined
    ? added(custom, { ...input, id: `custom-${randomUUID()}` })
    : changed(custom, { ...input, id });
}

// A voice as a preview plays it: the built-in voice, the name it greets with, and how it speaks.
export interface PreviewedVoice {
  voice: string;
  label: string;
  style?: string;
}

const builtInPreview = (id: string, builtIn: VoiceOption[]): PreviewedVoice => {
  const option = builtIn.find((voice) => voice.id === id);

  if (!option) throw refuse(`There is no voice ${id}`);

  return { voice: option.id, label: option.label };
};

const customPreview = (
  voice: CustomVoice,
  builtIn: VoiceOption[],
): PreviewedVoice => ({
  voice: baseOf(voice.baseVoice, builtIn),
  label: voice.label,
  style: voice.description,
});

const unsavedPreview = (
  custom: Pick<CustomVoice, 'label' | 'description'>,
): Omit<PreviewedVoice, 'voice'> => ({
  label: custom.label,
  style: custom.description,
});

// A custom voice not yet saved, a saved one, or a built-in one.
export function previewedVoice(
  input: VoicePreviewInput,
  custom: CustomVoice[],
  builtIn: VoiceOption[],
): PreviewedVoice {
  if (input.custom) {
    requireBaseVoice(input.voice, builtIn);

    return { voice: input.voice, ...unsavedPreview(input.custom) };
  }

  const saved = custom.find(({ id }) => id === input.voice);

  return saved
    ? customPreview(saved, builtIn)
    : builtInPreview(input.voice, builtIn);
}

// The custom voices without the one `id` names.
export function deletedCustomVoice(
  custom: CustomVoice[],
  id: string,
): CustomVoice[] {
  requireCustomVoice(id, custom);

  return custom.filter((voice) => voice.id !== id);
}
