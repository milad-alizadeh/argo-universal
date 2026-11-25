import { expect, it, vi } from 'vitest';

// Node has no expo-file-system; the module only needs to load and build a store.
vi.mock('expo-file-system', () => ({
  Directory: class {},
  File: class {},
  Paths: { cache: '/cache' },
}));

it('loads as a phone does and builds a store for a Server', async () => {
  const { createMediaStore } = await import('./media-store.native');

  expect(createMediaStore('server-1').find('/a')).toBeNull();
});
