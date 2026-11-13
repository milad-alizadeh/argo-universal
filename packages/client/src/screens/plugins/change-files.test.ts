import type { PageRunAnswer } from '@repo/contracts/plugins/page-address';
import { describe, expect, it, vi } from 'vitest';
import type { SessionPullRequest } from '#features/sessions';
import { remoteOf } from './change-files';
import type { OperationRunner } from './page-calls-ports';

const scope = { sessionId: 'session-1', projectId: 'project-1' };

const change: SessionPullRequest = {
  stage: 'open',
  id: 'github:fork/repo#12',
  repository: 'fork/repo',
  number: 12,
  head: 'abc1234',
  title: 'Same number in a fork',
  mergeable: true,
};

const reference = 'fork/repo#12';

const file = { operation: 'add', path: 'a.ts', additions: 1, deletions: 0 };

const page = {
  mainBranch: null,
  summary: { files: 1, additions: 1, deletions: 0 },
  comparison: { repository: 'fork/repo', base: 'main', head: 'abc1234' },
  files: [file],
  nextCursor: null,
};

const runnerOf = (
  result: PageRunAnswer['result'],
): Pick<OperationRunner, 'run'> => ({
  run: vi.fn<OperationRunner['run']>(() => Promise.resolve({ result })),
});

describe('remoteOf', () => {
  it("reads a Change's files by the Plugin's own Operation, for its repository and number and the Session's scope", async () => {
    const runner = runnerOf(page);

    await expect(
      remoteOf(runner, scope, change).readFiles(null),
    ).resolves.toEqual(page);
    expect(runner.run).toHaveBeenCalledWith({
      pluginId: 'github',
      operation: 'files',
      args: { reference },
      ...scope,
    });
  });

  it('asks for the next page by the cursor the previous one gave', async () => {
    const runner = runnerOf(page);

    await remoteOf(runner, scope, change).readFiles(2);

    expect(runner.run).toHaveBeenCalledWith(
      expect.objectContaining({
        args: { reference, cursor: 2 },
      }),
    );
  });

  it('reads a file by its path, from the same Change', async () => {
    const runner = runnerOf({
      file,
      patch: { format: 'git_patch', text: 'diff --git a/a.ts b/a.ts\n' },
      nextCursor: null,
    });

    await remoteOf(runner, scope, change).readDiff('a.ts');

    expect(runner.run).toHaveBeenCalledWith({
      pluginId: 'github',
      operation: 'diff',
      args: { reference, path: 'a.ts' },
      ...scope,
    });
  });

  it('refuses an answer that is not a page of files, so it is a failed read and not an empty list', async () => {
    await expect(
      remoteOf(runnerOf({ files: [] }), scope, change).readFiles(null),
    ).rejects.toThrow(Error);
  });

  it('keys a Change by its own identity and head, so another Change or a push never shares a read', () => {
    const runner = runnerOf(page);

    const key = (value: SessionPullRequest): readonly string[] =>
      remoteOf(runner, scope, value).key;

    expect(key(change)).not.toEqual(
      key({ ...change, repository: 'owner/repo' }),
    );
    expect(key(change)).not.toEqual(key({ ...change, head: 'def5678' }));
  });
});
