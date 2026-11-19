import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  loadVoiceVisualiser,
  saveVoiceVisualiser,
} from './voice-visualiser-choice';

afterEach(() => vi.unstubAllGlobals());

const stored = (value: string): ReturnType<typeof memoryStorage> => {
  const storage = memoryStorage();
  storage.setItem('voice-visualiser', value);

  return storage;
};

describe('The visualiser chosen on this Device', () => {
  it('draws the orb until the band is chosen, and remembers the choice across App starts', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    await expect(loadVoiceVisualiser()).resolves.toBe('orb');

    saveVoiceVisualiser('band');
    await expect(loadVoiceVisualiser()).resolves.toBe('band');

    saveVoiceVisualiser('orb');
    await expect(loadVoiceVisualiser()).resolves.toBe('orb');
  });

  it('draws the orb where the matrix or the wave was chosen before they were removed', async () => {
    vi.stubGlobal('window', { localStorage: stored('"matrix"') });
    await expect(loadVoiceVisualiser()).resolves.toBe('orb');

    vi.stubGlobal('window', { localStorage: stored('"wave"') });
    await expect(loadVoiceVisualiser()).resolves.toBe('orb');
  });

  it('draws the orb when what is stored is not a visualiser', async () => {
    vi.stubGlobal('window', { localStorage: stored('"spiral"') });

    await expect(loadVoiceVisualiser()).resolves.toBe('orb');
  });

  it('draws the orb when what is stored cannot be read', async () => {
    vi.stubGlobal('window', { localStorage: stored('{"band') });

    await expect(loadVoiceVisualiser()).resolves.toBe('orb');
  });
});
