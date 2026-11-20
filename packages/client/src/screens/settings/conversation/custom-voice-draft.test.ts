import { describe, expect, it } from 'vitest';
import {
  canSaveDraft,
  draftOf,
  previewOfDraft,
  savedOfDraft,
} from './custom-voice-draft';

const pirate = {
  id: 'pirate',
  label: 'Pirate',
  baseVoice: 'sol',
  description: 'Speaks like a cheerful pirate, slowly.',
};

describe('A custom voice being written', () => {
  it('starts empty on the first built-in voice when it is new', () => {
    expect(draftOf(undefined, 'cove')).toEqual({
      label: '',
      baseVoice: 'cove',
      description: '',
    });
  });

  it('starts from the custom voice it edits', () => {
    expect(draftOf(pirate, 'cove')).toEqual(pirate);
  });

  it('can be saved and heard once it has a name and says how it speaks', () => {
    const draft = draftOf(undefined, 'cove');

    expect(canSaveDraft(draft)).toBe(false);
    expect(canSaveDraft({ ...draft, label: 'Narrator' })).toBe(false);
    expect(canSaveDraft({ ...draft, label: '  ', description: 'Calm' })).toBe(
      false,
    );
    expect(
      canSaveDraft({ ...draft, label: 'Narrator', description: 'Calm' }),
    ).toBe(true);
  });

  it('is saved trimmed, as a new voice or as the one it edits', () => {
    expect(
      savedOfDraft({
        label: ' Narrator ',
        baseVoice: 'cove',
        description: ' A calm narrator. ',
      }),
    ).toEqual({
      label: 'Narrator',
      baseVoice: 'cove',
      description: 'A calm narrator.',
    });
    expect(savedOfDraft({ ...pirate, label: 'Pirate Pete' })).toEqual({
      ...pirate,
      label: 'Pirate Pete',
    });
  });

  it('is heard as its built-in voice told how to speak, before it is saved', () => {
    expect(previewOfDraft({ ...pirate, label: ' Pirate ' })).toEqual({
      voice: 'sol',
      custom: {
        label: 'Pirate',
        description: 'Speaks like a cheerful pirate, slowly.',
      },
    });
  });
});
