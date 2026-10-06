import { changesMocks } from '@repo/api/mocks';
import type { Fixtures } from './trpc-mock-link';

// `session.changes` and `session.diff` for one Checkout from the contract mocks (ADR 0010).
export function createChangesMocks(name: keyof typeof changesMocks) {
  const mock = changesMocks[name];
  return {
    'session.changes': () => mock.files,
    'session.diff': ({ path }) => {
      const diff = mock.diffs[path];
      if (!diff) throw new Error(`No diff mock for ${path}`);
      return diff;
    },
  } satisfies Fixtures;
}
