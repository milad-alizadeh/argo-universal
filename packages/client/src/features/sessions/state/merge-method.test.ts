import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../../../../mocks/memory-storage';
import { mergeMethodQuery, rememberMergeMethod } from './merge-method';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the merge method on this device', () => {
  it('is squash until one is picked', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    await expect(new QueryClient().fetchQuery(mergeMethodQuery)).resolves.toBe(
      'squash',
    );
  });

  it('is the one picked last at the next App start', async () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    rememberMergeMethod(new QueryClient(), 'merge');
    rememberMergeMethod(new QueryClient(), 'rebase');
    await expect(new QueryClient().fetchQuery(mergeMethodQuery)).resolves.toBe(
      'rebase',
    );
  });
});
