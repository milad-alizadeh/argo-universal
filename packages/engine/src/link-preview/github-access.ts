import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { z } from 'zod';
import { shellEnvironment } from '../agents';
import { GitCommit, type GitData, GitItem } from './github';

const exec = promisify(execFile);

const timeoutMs = 8000;

const outputLimit = 1_048_576;

// This process owner uses the Server's gh sign-in; argv and parsed results carry no token to the App.
export async function readGitHub(path: string): Promise<GitData> {
  const env = await shellEnvironment(process.cwd());

  const { stdout } = await exec(
    'gh',
    ['api', '--hostname', 'github.com', path],
    {
      env,
      timeout: timeoutMs,
      maxBuffer: outputLimit,
    },
  );

  return z.union([GitItem, GitCommit]).parse(JSON.parse(stdout));
}
