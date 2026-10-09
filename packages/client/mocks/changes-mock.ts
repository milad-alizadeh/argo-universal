import { changesMocks } from '@repo/mocks/app';
import type { FixtureArguments } from './trpc-mock-link';
import type { Fixtures } from './trpc-mock-link';

// `session.changes` and `session.diff` for one Checkout from the contract mocks (ADR 0010).
export function createChangesMocks(name: keyof typeof changesMocks): {
  'session.changes': () => (typeof changesMocks)[keyof typeof changesMocks]['files'];
  'session.diff': (
    input: FixtureArguments<'session.diff'>[0],
  ) => (typeof changesMocks)[keyof typeof changesMocks]['diffs'][string];
} {
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
