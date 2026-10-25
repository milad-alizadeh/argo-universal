import { afterEach, expect, it, vi } from 'vitest';
import { readGitHub } from './github-access';
import { PreviewUnavailable } from './preview-unavailable';
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

it('expects a Server without gh, so the preview is unavailable and nothing is reported', async () => {
  const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});

  const missing = Object.assign(new Error('spawn gh ENOENT'), {
    code: 'ENOENT',
    syscall: 'spawn gh',
  });

  await expect(
    readGitHub(issuePath, () => Promise.reject(missing)),
  ).rejects.toBeInstanceOf(PreviewUnavailable);
  expect(diagnostic).not.toHaveBeenCalled();
});

it('lets any other fault running gh surface unchanged', async () => {
  const fault = Object.assign(new Error('spawn EMFILE'), {
    code: 'EMFILE',
    syscall: 'spawn gh',
  });

  await expect(readGitHub(issuePath, () => Promise.reject(fault))).rejects.toBe(
    fault,
  );
});
