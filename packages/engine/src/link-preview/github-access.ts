import type { ProcessResult } from '@repo/contracts/plugins/argo-calls';
import { createRejectionCounter } from '@repo/machine-log';
import { z } from 'zod';
import { shellEnvironment } from '../agents';
import type { CheckedCommand } from '../plugins/access/plugin-access';
import { PluginProcesses } from '../plugins/services/plugin-processes';
import { GitCommit, type GitData, GitItem } from './github';
import { PreviewUnavailable, unavailable } from './preview-unavailable';

const timeoutMs = 8000;

const rejections = createRejectionCounter('Link preview GitHub');

type GitHubCommand = (path: string) => Promise<string>;

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

async function ghOutput(path: string): Promise<string> {
  const runner = new PluginProcesses();

  try {
    const result = await runner.run(await ghCommand(path));

    return successfulOutput(result);
  } finally {
    runner.release();
  }
}

async function ghCommand(path: string): Promise<CheckedCommand> {
  const environment = await shellEnvironment(process.cwd());

  const entries = Object.entries(environment).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );

  return {
    argv: ['gh', 'api', '--hostname', 'github.com', path],
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
