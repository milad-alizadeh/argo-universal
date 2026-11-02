import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import { draftKey } from '../utils/draft-key';
import { keptDraftsOnDevice } from './kept-draft';

const key = draftKey({ type: 'session', sessionId: 'session-1' });

const lastDraft = 'Ship on Friday';

function stubMemoryStorage(): ReturnType<typeof memoryStorage> {
  const storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });

  return storage;
}

describe('kept drafts on this Device', () => {
  it('keeps the last text written while an earlier write is still saving', async () => {
    stubMemoryStorage();
    const drafts = keptDraftsOnDevice();
    const save = AsyncStorage.setItem.bind(AsyncStorage);
    const firstWrite = Promise.withResolvers<void>();
    vi.spyOn(AsyncStorage, 'setItem').mockImplementationOnce(
      async (written, text) => {
        await firstWrite.promise;
        await save(written, text);
      },
    );
    drafts.keep(key, 'Ship');
    drafts.keep(key, lastDraft);
    firstWrite.resolve();
    expect(await drafts.load(key)).toBe(lastDraft);
  });

  it('forgets the draft once its text is empty', async () => {
    const storage = stubMemoryStorage();
    const drafts = keptDraftsOnDevice();
    drafts.keep(key, lastDraft);
    drafts.keep(key, '');
    await drafts.load(key);
    expect(storage.getItem(key)).toBeNull();
  });

  it('reads an empty draft when the read fails', async () => {
    stubMemoryStorage();
    const drafts = keptDraftsOnDevice();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(AsyncStorage, 'getItem').mockRejectedValue(
      new Error('Storage is unavailable'),
    );
    expect(await drafts.load(key)).toBe('');
  });
});
