import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import { loadThemeChoice, saveThemeChoice } from './theme-choice';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the theme on this Device', () => {
  it('is System until one is chosen', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });

    await expect(loadThemeChoice()).resolves.toBe('system');
  });

  it('is the one chosen last at the next App start', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    saveThemeChoice('light');
    saveThemeChoice('dark');

    await expect(loadThemeChoice()).resolves.toBe('dark');
  });

  it('is System when the stored value is not a theme', async () => {
    const storage = memoryStorage();
    storage.setItem('theme-choice', 'sepia');
    vi.stubGlobal('window', { localStorage: storage });

    await expect(loadThemeChoice()).resolves.toBe('system');
  });

  it('is System when storage cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('window', {
      localStorage: {
        ...memoryStorage(),
        getItem: (): never => {
          throw new Error('storage is locked');
        },
      },
    });

    await expect(loadThemeChoice()).resolves.toBe('system');
  });
});
