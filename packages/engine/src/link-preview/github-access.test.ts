import { afterEach, expect, it, vi } from 'vitest';
import { readGitHub } from './github-access';
import { item } from './preview.mocks';

const issuePath = 'repos/acme/private/issues/42';

afterEach(() => vi.restoreAllMocks());

it('decodes a GitHub issue at the command output boundary', async () => {
  const execute = vi
    .fn<(path: string) => Promise<string>>()
    .mockResolvedValue(JSON.stringify(item));

  expect(await readGitHub(issuePath, execute)).toEqual(item);
  expect(execute).toHaveBeenCalledWith(issuePath);
});

it('decodes commits without a GitHub user', async () => {
  const data = {
    sha: 'abcdef0123456789',
    author: null,
    commit: {
      message: 'A commit',
      author: { name: 'A Person', date: item.created_at },
    },
  };

  expect(
    await readGitHub('repos/acme/private/commits/abcdef0', async () =>
      JSON.stringify(data),
    ),
  ).toEqual(data);
});

it.each(['not JSON', '{"title":"private title","unexpected":"secret"}'])(
  'reports and counts a rejected response without logging its contents',
  async (output) => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(readGitHub(issuePath, async () => output)).rejects.toThrow(
      'Invalid GitHub preview response',
    );
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic).toHaveBeenCalledWith(
      expect.stringMatching(/^Link preview GitHub: Rejected response #\d+$/),
    );
  },
);
