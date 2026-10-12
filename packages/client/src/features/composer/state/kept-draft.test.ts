import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import { keepDraft, loadKeptDraft } from './kept-draft';

const key = 'composer-draft:session:session-1';
const lastDraft = 'Ship on Friday';

function stubMemoryStorage(): ReturnType<typeof memoryStorage> {
  const storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });
  return storage;
}

describe('kept drafts on this Device', () => {
  it('keeps the last text written while an earlier write is still saving', async () => {
    stubMemoryStorage();
    const save = AsyncStorage.setItem.bind(AsyncStorage);
    const firstWrite = Promise.withResolvers<void>();
    vi.spyOn(AsyncStorage, 'setItem').mockImplementationOnce(
      async (written, text) => {
        await firstWrite.promise;
        await save(written, text);
      },
    );
    keepDraft(key, 'Ship');
    keepDraft(key, lastDraft);
    firstWrite.resolve();
    expect(await loadKeptDraft(key)).toBe(lastDraft);
  });

  it('forgets the draft once its text is empty', async () => {
    const storage = stubMemoryStorage();
    keepDraft(key, lastDraft);
    keepDraft(key, '');
    await loadKeptDraft(key);
    expect(storage.getItem(key)).toBeNull();
  });

  it('reads an empty draft when the read fails', async () => {
    stubMemoryStorage();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(AsyncStorage, 'getItem').mockRejectedValue(
      new Error('Storage is unavailable'),
    );
    expect(await loadKeptDraft(key)).toBe('');
  });
});
