import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  loadFollowUpSuggestions,
  saveFollowUpSuggestions,
} from './follow-up-suggestions';

afterEach(() => vi.unstubAllGlobals());

describe('Follow-up suggestions preference on this Device', () => {
  it('starts enabled and remembers the last choice across App starts', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    await expect(loadFollowUpSuggestions()).resolves.toBe(true);
    saveFollowUpSuggestions(false);
    await expect(loadFollowUpSuggestions()).resolves.toBe(false);
    saveFollowUpSuggestions(true);
    await expect(loadFollowUpSuggestions()).resolves.toBe(true);
  });

  it('uses the default when storage has an unrecognized value', async () => {
    const storage = memoryStorage();
    storage.setItem('follow-up-suggestions', 'unknown');
    vi.stubGlobal('window', { localStorage: storage });
    await expect(loadFollowUpSuggestions()).resolves.toBe(true);
  });
});
