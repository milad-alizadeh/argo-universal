import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parentPort } from 'node:worker_threads';
import { z } from 'zod';

const execute = promisify(execFile);

const outputLimit = 33_554_432;

export type GitRequest =
  | { type: 'run'; id: number; directory: string; args: string[] }
  | { type: 'abort'; id: number };

// What `execFile` puts on its error, kept as plain data because a thread message drops an Error's own fields.
const GitFailure = z.object({
  name: z.string(),
  message: z.string(),
  code: z.union([z.number(), z.string()]).nullish().default(null),
  stdout: z.string().default(''),
  stderr: z.string().default(''),
});

export type GitFailure = z.infer<typeof GitFailure>;

export type GitReply =
  | { id: number; stdout: string }
  | { id: number; failure: GitFailure };

const running = new Map<number, AbortController>();

const reply = (message: GitReply): void => parentPort?.postMessage(message);

const read = async (
  { directory, args }: GitRequest & { type: 'run' },
  signal: AbortSignal,
): Promise<string> => {
  const { stdout } = await execute('git', ['-C', directory, ...args], {
    maxBuffer: outputLimit,
    signal,
    // No git command waits on a person: a remote that asks for a password fails instead of hanging.
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });

  return stdout;
};

const run = async (request: GitRequest & { type: 'run' }): Promise<void> => {
  const controller = new AbortController();

  running.set(request.id, controller);

  try {
    reply({ id: request.id, stdout: await read(request, controller.signal) });
  } catch (error) {
    reply({ id: request.id, failure: GitFailure.parse(error) });
  } finally {
    running.delete(request.id);
  }
};

parentPort?.on('message', (request: GitRequest): void => {
  if (request.type === 'run') void run(request);
  else running.get(request.id)?.abort();
});
