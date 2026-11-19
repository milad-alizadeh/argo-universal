import type { CustomVoice, CustomVoiceInput } from '@repo/contracts';

// A custom voice as its form holds it: a new one has no id yet.
export type CustomVoiceDraft = CustomVoiceInput;

// What `voice.preview` is given to play a custom voice that may not be saved yet.
export interface CustomVoicePreview {
  voice: string;
  custom: Pick<CustomVoice, 'label' | 'description'>;
}

// The voice it edits, or an empty one on the provider's first voice.
export const draftOf = (
  voice: CustomVoice | undefined,
  firstVoice: string,
): CustomVoiceDraft =>
  voice ?? { label: '', baseVoice: firstVoice, description: '' };

// A name, a voice to speak with, and how it speaks: what the Server needs to keep it or play it.
export const canSaveDraft = (draft: CustomVoiceDraft): boolean =>
  [draft.label, draft.baseVoice, draft.description].every(
    (part) => part.trim() !== '',
  );

export const savedOfDraft = (draft: CustomVoiceDraft): CustomVoiceInput => ({
  ...draft,
  label: draft.label.trim(),
  description: draft.description.trim(),
});

export const previewOfDraft = (
  draft: CustomVoiceDraft,
): CustomVoicePreview => ({
  voice: draft.baseVoice,
  custom: {
    label: draft.label.trim(),
    description: draft.description.trim(),
  },
});
