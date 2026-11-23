import { expect, it, vi } from 'vitest';
import { discoverPullRequests } from './turn-end-discovery';

const turn = { sessionId: 'session', projectId: 'project' };

it.each([
  { result: 'unavailable', signIn: true, expected: true },
  { result: 'unavailable', signIn: false, expected: false },
  { result: 'no-match', signIn: false, expected: false },
])(
  'reports a sign-in failure only for $result with signIn=$signIn',
  async ({ result, signIn, expected }) => {
    const signInRequired = vi.fn<(sessionId: string) => void>();

    const operations = {
      rows: async (): Promise<{ id: string }[]> => [{ id: 'github.discover' }],
      run: async (): Promise<{ result: string; signIn: boolean }> => ({
        result,
        signIn,
      }),
    };

    await discoverPullRequests({ home: '', operations, signInRequired }, turn);

    expect(signInRequired.mock.calls).toEqual(
      expected ? [[turn.sessionId]] : [],
    );
  },
);
