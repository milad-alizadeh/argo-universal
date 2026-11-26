import type { ProcessResult } from '@repo/contracts/plugins/argo-calls';
import { describe, expect, it } from 'vitest';
import type { CheckedCommand } from '../access/plugin-access';
import { GitHubCliCache } from './github-cli-cache';
import { PluginFetchCache } from './plugin-fetch-cache';

const read = [
  'gh',
  'api',
  '--hostname',
  'github.com',
  '--method',
  'GET',
  '--include',
  '--',
];

const commandOf = (argv: string[]): CheckedCommand => ({
  argv,
  cwd: '/tmp',
  env: { GH_PROMPT_DISABLED: '1' },
});

const readOf = (endpoint: string): CheckedCommand =>
  commandOf([...read, endpoint]);

const printed = (
  status: string,
  headers: Record<string, string>,
  body = '',
): ProcessResult => ({
  exitCode: status.startsWith('2') || status.startsWith('3') ? 0 : 1,
  stdout: `HTTP/2.0 ${status}\r\n${Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}\r\n`)
    .join('')}\r\n${body}`,
  stderr: '',
  truncated: false,
  timedOut: false,
});

type Gh = {
  argvs: string[][];
  answer: (result: ProcessResult) => void;
  run: (command: CheckedCommand) => Promise<ProcessResult>;
};

// A `gh` that answers whatever it was last told to, and records the argv of each run.
function ghOf(first: ProcessResult): Gh {
  let next = first;
  const argvs: string[][] = [];

  return {
    argvs,
    answer: (result): void => {
      next = result;
    },
    run: async ({ argv }): Promise<ProcessResult> => {
      argvs.push([...argv]);

      return next;
    },
  };
}

const pullOne = 'repos/o/r/pulls/1';

const cacheAt = (now = 1_000_000): GitHubCliCache =>
  new GitHubCliCache(new PluginFetchCache({ now: () => now }));

describe('GitHub CLI reads', () => {
  it('asks gh again with the kept ETag, and a 304 answers what the first read printed', async () => {
    const cache = cacheAt();
    const endpoint = pullOne;
    const gh = ghOf(printed('200 OK', { Etag: '"a"' }, '{"title":"One"}'));

    const first = await cache.run(readOf(endpoint), gh.run);

    gh.answer(printed('304 Not Modified', { Etag: '"a"' }));

    const second = await cache.run(readOf(endpoint), gh.run);

    expect(second.stdout).toBe(first.stdout);
    expect(second.exitCode).toBe(0);
    expect(gh.argvs[1]).toEqual([
      ...read.slice(0, -1),
      '-H',
      'If-None-Match: "a"',
      '--',
      endpoint,
    ]);
  });

  it('keeps a changed answer over the old one', async () => {
    const cache = cacheAt();
    const endpoint = pullOne;
    const gh = ghOf(printed('200 OK', { Etag: '"a"' }, '{"title":"One"}'));

    await cache.run(readOf(endpoint), gh.run);
    gh.answer(printed('200 OK', { Etag: '"b"' }, '{"title":"Two"}'));
    const changed = await cache.run(readOf(endpoint), gh.run);
    gh.answer(printed('304 Not Modified', { Etag: '"b"' }));

    expect((await cache.run(readOf(endpoint), gh.run)).stdout).toBe(
      changed.stdout,
    );
    expect(gh.argvs[2]).toContain('If-None-Match: "b"');
  });

  it('runs any other command as it was given', async () => {
    const cache = cacheAt();
    const other = commandOf(['gh', 'pr', 'view', '12']);
    const gh = ghOf(printed('200 OK', { Etag: '"a"' }));

    await cache.run(other, gh.run);
    await cache.run(other, gh.run);

    expect(gh.argvs).toEqual([other.argv, other.argv]);
  });

  it('runs gh no more while GitHub says the limit is spent', async () => {
    const cache = cacheAt();

    const gh = ghOf(
      printed('403 Forbidden', {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': '4000000000',
      }),
    );

    await cache.run(readOf(pullOne), gh.run);
    const refused = await cache.run(readOf('repos/o/r/pulls/2'), gh.run);

    expect(gh.argvs).toHaveLength(1);
    expect(refused.exitCode).not.toBe(0);
    expect(refused.stdout).toMatch(/^HTTP\/\S+ 429/);
  });
});
