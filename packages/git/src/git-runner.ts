import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GitFailure, GitRequest, type GitReply } from './git-messages.ts';

const execute = promisify(execFile);

const outputLimit = 33_554_432;

type Run = Extract<GitRequest, { type: 'run' }>;

const running = new Map<number, AbortController>();

const reply = (message: GitReply): void => void process.send?.(message);

// A thrown value that is not an Error still fails its own command, and only that one.
const unreadable = (thrown: string): GitFailure =>
  GitFailure.parse({ name: 'Error', message: thrown });

const read = async (
  { directory, args, env }: Run,
  signal: AbortSignal,
): Promise<string> => {
  const { stdout } = await execute('git', ['-C', directory, ...args], {
    maxBuffer: outputLimit,
    signal,
    env,
  });

  return stdout;
};

const run = async (request: Run): Promise<void> => {
  const controller = new AbortController();

  running.set(request.id, controller);

  try {
    reply({ id: request.id, stdout: await read(request, controller.signal) });
  } catch (error) {
    const failure = GitFailure.safeParse(error);

    reply({
      id: request.id,
      failure: failure.success ? failure.data : unreadable(String(error)),
    });
  } finally {
    running.delete(request.id);
  }
};

const receive = (request: GitRequest): void => {
  if (request.type === 'run') void run(request);
  else running.get(request.id)?.abort();
};

process.on('message', (raw): void => receive(GitRequest.parse(raw)));

// The process that asks for git has gone, so nothing waits for these commands.
process.on('disconnect', (): void => {
  for (const controller of running.values()) controller.abort();
  process.exit();
});
