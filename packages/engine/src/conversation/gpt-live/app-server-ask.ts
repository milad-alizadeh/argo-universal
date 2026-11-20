import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { z } from 'zod';
import { frameRejections, readFrame } from './read-frame';

// What Codex's app-server says about the sign-in.
export type AuthAnswer = {
  authMethod?: string | null;
  authToken?: string | null;
};

export const unreadable = 'Codex did not answer; try again.';

export const notInstalled = 'Install Codex to talk with GPT-Live.';

const initializeId = 1;

const authStatusId = 2;

type Request =
  | {
      id: number;
      method: 'initialize';
      params: { clientInfo: { name: string; title: string; version: string } };
    }
  | { method: 'initialized' }
  | {
      id: number;
      method: 'getAuthStatus';
      params: { includeToken: boolean; refreshToken: boolean };
    };

const reply = z.looseObject({
  id: z.number().optional(),
  result: z
    .looseObject({
      authMethod: z.string().nullish(),
      authToken: z.string().nullish(),
    })
    .optional(),
});

type Reply = z.infer<typeof reply>;

const rejectFrame = frameRejections('Codex app-server');

// A line that is not a reply names no request, so it is answered by nothing; one that is not JSON is also reported.
const replyOf = (line: string): Reply =>
  readFrame(reply, line, rejectFrame) ?? {};

/*
 * One `codex app-server` over standard input and output, asked once: `getAuthStatus` with `includeToken`, then stopped.
 * The token goes no further than the answer.
 */
class AppServerAsk {
  private readonly child: ChildProcessByStdio<Writable, Readable, null>;
  private buffer = '';
  private done = false;
  private readonly timer: ReturnType<typeof setTimeout>;

  public constructor(
    program: string,
    timeoutMs: number,
    private readonly settle: {
      resolve: (answer: AuthAnswer) => void;
      reject: (error: Error) => void;
    },
  ) {
    this.child = spawn(program, ['app-server'], {
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    this.timer = setTimeout(() => this.fail(unreadable), timeoutMs);
  }

  public start(): void {
    this.child.on('error', () => this.fail(notInstalled));
    this.child.on('exit', () => this.fail(unreadable));
    this.child.stdout.on('data', (chunk: Buffer) =>
      this.take(chunk.toString()),
    );
    this.send({
      id: initializeId,
      method: 'initialize',
      params: { clientInfo: { name: 'argo', title: 'Argo', version: '1' } },
    });
  }

  private send(request: Request): void {
    this.child.stdin.write(`${JSON.stringify(request)}\n`);
  }

  private take(text: string): void {
    const lines = (this.buffer + text).split('\n');
    this.buffer = lines.pop() ?? '';

    for (const line of lines) this.onReply(replyOf(line));
  }

  private onReply(message: Reply): void {
    if (message.id === initializeId) this.askAuth();

    if (message.id === authStatusId) this.answer(message);
  }

  private askAuth(): void {
    this.send({ method: 'initialized' });
    this.send({
      id: authStatusId,
      method: 'getAuthStatus',
      params: { includeToken: true, refreshToken: false },
    });
  }

  private answer(message: Reply): void {
    if (message.result)
      this.finish(() => this.settle.resolve(message.result ?? {}));
    else this.fail(unreadable);
  }

  private fail(reason: string): void {
    this.finish(() => this.settle.reject(new Error(reason)));
  }

  private finish(settle: () => void): void {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.timer);
    this.child.kill();
    settle();
  }
}

// Asks the installed Codex for the sign-in and the ChatGPT token.
export function askAppServer(
  program: string,
  timeoutMs: number,
): Promise<AuthAnswer> {
  return new Promise((resolve, reject) =>
    new AppServerAsk(program, timeoutMs, { resolve, reject }).start(),
  );
}
