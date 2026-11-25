import { expect, it } from 'vitest';
import { createMediaStore } from './media-store.native';

// Loaded as a phone loads it: the shared pieces come from `./media-store-core`, so nothing is undefined at load.
it('loads as a phone does and builds a store for a Server', () => {
  expect(createMediaStore('server-1').find('/a')).toBeNull();
});
