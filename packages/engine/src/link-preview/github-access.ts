import type { ProcessResult } from '@repo/contracts/plugins/argo-calls';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
import { shellEnvironment } from '../agents';
import type { CheckedCommand } from '../plugins/access/plugin-access';
import { realClock } from '../plugins/clock';
import {
  GitHubCliCache,
  printedBody,
  readForm,
} from '../plugins/services/github-cli-cache';
import { PluginFetchCache } from '../plugins/services/plugin-fetch-cache';
import { PluginProcesses } from '../plugins/services/plugin-processes';
import { GitCommit, type GitData, GitItem } from './github';
import { PreviewUnavailable, unavailable } from './preview-unavailable';

const timeoutMs = 8000;

const rejections = createRejectionCounter('Link preview GitHub');

type GitHubCommand = (path: string) => Promise<string>;

type Run = (command: CheckedCommand) => Promise<ProcessResult>;

// Use the Server's gh sign-in through its existing bounded argv runner. No token reaches the App.
export async function readGitHub(
  path: string,
  execute: GitHubCommand = ghOutput,
): Promise<GitData> {
  const stdout = await execute(path).catch(missingGhIsExpected);

  return decode(path, stdout);
}

function decode(path: string, stdout: string): GitData {
  try {
    const schema = path.includes('/commits/') ? GitCommit : GitItem;

    return schema.parse(JSON.parse(stdout));
  } catch {
    rejections.report('Rejected response');
    throw new PreviewUnavailable('Invalid GitHub preview response');
  }
}

async function runOnce(command: CheckedCommand): Promise<ProcessResult> {
  const runner = new PluginProcesses();

  try {
    return await runner.run(command);
  } finally {
    runner.release();
  }
}

/*
 * A preview is read with the answer's headers, through the cache a Plugin's `gh` reads use: the same link asked again
 * sends its ETag, and GitHub answers a 304 it does not count against the rate limit.
 */
export function githubOutput(run: Run): GitHubCommand {
  const cache = new GitHubCliCache(new PluginFetchCache(realClock));

  return async (path) =>
    printedBody(successfulOutput(await cache.run(await ghCommand(path), run)));
}

const ghOutput = githubOutput(runOnce);

async function ghCommand(path: string): Promise<CheckedCommand> {
  const environment = await shellEnvironment(process.cwd());

  const entries = Object.entries(environment).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );

  return {
    argv: [...readForm, path],
    cwd: process.cwd(),
    env: Object.fromEntries(entries),
    timeoutMs,
  };
}

const missingGh = z.object({
  code: z.literal('ENOENT'),
  syscall: z.string().startsWith('spawn'),
});

// Without `gh` on the Server there is no private preview to give; any other spawn fault is not expected.
function missingGhIsExpected(cause: unknown): never {
  if (missingGh.safeParse(cause).success) throw unavailable(cause);

  throw cause;
}

function successfulOutput(result: ProcessResult): string {
  if ([result.exitCode !== 0, result.timedOut, result.truncated].some(Boolean))
    throw new PreviewUnavailable('GitHub preview fetch failed');

  return result.stdout;
}
