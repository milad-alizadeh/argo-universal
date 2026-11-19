import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  loadVoiceVisualiser,
  saveVoiceVisualiser,
} from './voice-visualiser-choice';

afterEach(() => vi.unstubAllGlobals());

describe('The visualiser chosen on this Device', () => {
  it('draws the orb until another is chosen, and remembers the choice across App starts', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    await expect(loadVoiceVisualiser()).resolves.toBe('orb');

    saveVoiceVisualiser('matrix');
    await expect(loadVoiceVisualiser()).resolves.toBe('matrix');

    saveVoiceVisualiser('wave');
    await expect(loadVoiceVisualiser()).resolves.toBe('wave');
  });

  it('draws the orb when what is stored is not a visualiser', async () => {
    const storage = memoryStorage();
    storage.setItem('voice-visualiser', '"spiral"');
    vi.stubGlobal('window', { localStorage: storage });

    await expect(loadVoiceVisualiser()).resolves.toBe('orb');
  });

  it('draws the orb when what is stored cannot be read', async () => {
    const storage = memoryStorage();
    storage.setItem('voice-visualiser', '{"matrix');
    vi.stubGlobal('window', { localStorage: storage });

    await expect(loadVoiceVisualiser()).resolves.toBe('orb');
  });
});
