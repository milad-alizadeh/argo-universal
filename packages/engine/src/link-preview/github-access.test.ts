import type { ProcessResult } from '@repo/contracts/plugins/argo-calls';
import { afterEach, expect, it, vi } from 'vitest';
import { githubOutput, readGitHub } from './github-access';
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

// What `gh api --include` prints: the status line, the headers, a blank line, then the body.
const printed = (status: string, etag: string, body = ''): ProcessResult => ({
  exitCode: 0,
  stdout: `HTTP/2.0 ${status}\r\nEtag: ${etag}\r\n\r\n${body}`,
  stderr: '',
  truncated: false,
  timedOut: false,
});

it('asks gh again with the kept ETag, so a preview GitHub has not changed costs no rate limit', async () => {
  const argvs: string[][] = [];

  const answers = [
    printed('200 OK', '"a"', JSON.stringify(item)),
    printed('304 Not Modified', '"a"'),
  ];

  const execute = githubOutput(async ({ argv }) => {
    argvs.push([...argv]);

    return answers.shift() ?? printed('500 Server Error', '"x"');
  });

  expect(await readGitHub(issuePath, execute)).toEqual(item);
  expect(await readGitHub(issuePath, execute)).toEqual(item);
  expect(argvs[1]).toEqual([
    'gh',
    'api',
    '--hostname',
    'github.com',
    '--method',
    'GET',
    '--include',
    '-H',
    'If-None-Match: "a"',
    '--',
    issuePath,
  ]);
});
