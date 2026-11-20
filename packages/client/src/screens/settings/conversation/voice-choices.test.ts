import { defaultVoiceCallOptions, type VoiceSettings } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { chosenVoiceLabel, voiceChoices } from './voice-choices';

const settings: VoiceSettings = {
  enabled: true,
  provider: 'gpt-live',
  voice: 'pirate',
  providers: [
    {
      id: 'gpt-live',
      label: 'GPT-Live',
      experimental: true,
      availability: { usable: true },
    },
  ],
  voices: [
    { id: 'cove', label: 'Cove', description: 'Calm and even' },
    { id: 'sol', label: 'Sol', description: 'Bright and quick' },
    { id: 'maple', label: 'Maple' },
  ],
  customVoices: [
    {
      id: 'pirate',
      label: 'Pirate',
      baseVoice: 'sol',
      description: 'Speaks like a cheerful pirate, slowly.',
    },
  ],
  instructions: '',
  options: defaultVoiceCallOptions,
};

// The names each part of the list shows for a search.
interface Titles {
  custom: string[];
  builtIn: string[];
}

const titles = (query: string): Titles => {
  const choices = voiceChoices(settings, query);

  return {
    custom: choices.custom.map(({ label }) => label),
    builtIn: choices.builtIn.map(({ label }) => label),
  };
};

describe('The voices Settings › Voice offers', () => {
  it("lists the person's voices, then the provider's, under the provider's name", () => {
    const choices = voiceChoices(settings, '');

    expect(titles('')).toEqual({
      custom: ['Pirate'],
      builtIn: ['Cove', 'Sol', 'Maple'],
    });
    expect(choices.builtInTitle).toBe('GPT-Live voices');
  });

  it('describes a custom voice by how it speaks and the voice it speaks with', () => {
    expect(voiceChoices(settings, '').custom[0]?.subtitle).toBe(
      'Speaks like a cheerful pirate, slowly. · Sol',
    );
  });

  it("describes a built-in voice with the provider's description, where it has one", () => {
    const { builtIn } = voiceChoices(settings, '');

    expect(builtIn.map(({ subtitle }) => subtitle)).toEqual([
      'Calm and even',
      'Bright and quick',
      undefined,
    ]);
  });

  it('matches names and descriptions, whatever the case', () => {
    expect(titles('BRIGHT')).toEqual({ custom: [], builtIn: ['Sol'] });
    expect(titles('pirate')).toEqual({ custom: ['Pirate'], builtIn: [] });
    expect(titles('  cove ')).toEqual({ custom: [], builtIn: ['Cove'] });
  });

  it('matches a custom voice by the voice it speaks with', () => {
    expect(titles('sol').custom).toEqual(['Pirate']);
  });

  it('leaves nothing when nothing matches', () => {
    expect(titles('nobody')).toEqual({ custom: [], builtIn: [] });
  });
});

describe('The chosen voice, as the Voice row shows it', () => {
  it('names a custom voice by its own name', () => {
    expect(chosenVoiceLabel(settings)).toBe('Pirate');
  });

  it('names a built-in voice', () => {
    expect(chosenVoiceLabel({ ...settings, voice: 'cove' })).toBe('Cove');
  });

  it('shows nothing while no voice is chosen, or the chosen one is gone', () => {
    expect(chosenVoiceLabel({ ...settings, voice: null })).toBe('');
    expect(chosenVoiceLabel({ ...settings, voice: 'gone' })).toBe('');
  });
});
