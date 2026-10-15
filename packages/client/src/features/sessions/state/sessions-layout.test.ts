import AsyncStorage from '@react-native-async-storage/async-storage';
import { describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  sessionsLayoutOnDevice,
  sessionsLayoutStorageKey,
} from './sessions-layout';

function stubMemoryStorage(): ReturnType<typeof memoryStorage> {
  const storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });

  return storage;
}

describe('the Sessions layout on this Device', () => {
  it('starts Regular and loads the layout this Device kept', async () => {
    stubMemoryStorage().setItem(sessionsLayoutStorageKey, 'compact');
    const layout = sessionsLayoutOnDevice();
    expect(layout.get()).toBe('regular');
    await layout.loaded;
    expect(layout.get()).toBe('compact');
  });

  it('keeps a choice for the next start', async () => {
    const storage = stubMemoryStorage();
    sessionsLayoutOnDevice().choose('compact');
    await vi.waitFor(() =>
      expect(storage.getItem(sessionsLayoutStorageKey)).toBe('compact'),
    );
    const next = sessionsLayoutOnDevice();
    await next.loaded;
    expect(next.get()).toBe('compact');
  });

  it('keeps a choice made before the kept layout loads', async () => {
    stubMemoryStorage().setItem(sessionsLayoutStorageKey, 'compact');
    const layout = sessionsLayoutOnDevice();
    layout.choose('regular');
    await layout.loaded;
    expect(layout.get()).toBe('regular');
  });

  it('tells subscribers when the layout changes', () => {
    stubMemoryStorage();
    const layout = sessionsLayoutOnDevice();
    const listener = vi.fn<() => void>();
    layout.subscribe(listener);
    layout.choose('compact');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('stays Regular when the kept layout cannot be read', async () => {
    stubMemoryStorage();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(AsyncStorage, 'getItem').mockRejectedValue(
      new Error('Storage is unavailable'),
    );
    const layout = sessionsLayoutOnDevice();
    await layout.loaded;
    expect(layout.get()).toBe('regular');
  });
});
