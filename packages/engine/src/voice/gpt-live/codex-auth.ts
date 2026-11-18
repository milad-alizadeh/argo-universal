import { spawn } from 'node:child_process';
import { resolveExecutable } from '@repo/executables';

// What the installed Codex says about the person's ChatGPT sign-in. The token is held by the caller for one call and never stored.
export type CodexReading =
  | { signedIn: true; token: string }
  | { signedIn: false; reason: string };

export interface CodexAuth {
  // Asks Codex afresh; Argo never refreshes or keeps a token itself.
  read: () => Promise<CodexReading>;
}

export type CodexAppServerOptions = {
  // The Codex program; found on PATH when left out.
  program?: () => string;
  timeoutMs?: number;
};

const notInstalled = 'Install Codex to talk with GPT-Live.';
const notSignedIn = 'Sign in to Codex with ChatGPT to talk with GPT-Live.';
const unreadable = 'Codex did not answer; try again.';

const defaultProgram = (): string =>
  process.env.CODEX_PATH ?? resolveExecutable('codex');

function findProgram(program: () => string): string | undefined {
  try {
    return program();
  } catch {
    return undefined;
  }
}

type AuthAnswer = { authMethod?: string | null; authToken?: string | null };

// One `codex app-server` over standard input and output, asked once: `getAuthStatus` with `includeToken`, then stopped.
function askAppServer(program: string, timeoutMs: number): Promise<AuthAnswer> {
  return new Promise((resolve, reject) => {
    const child = spawn(program, ['app-server'], {
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const timer = setTimeout(() => finish(new Error(unreadable)), timeoutMs);
    let buffer = '';
    let done = false;

    function finish(error: Error | null, answer?: AuthAnswer): void {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();

      if (error) reject(error);
      else resolve(answer ?? {});
    }

    const send = (message: Record<string, unknown>): void => {
      child.stdin.write(`${JSON.stringify(message)}\n`);
    };

    const handle = (line: string): void => {
      const message = JSON.parse(line) as {
        id?: number;
        result?: AuthAnswer;
        error?: unknown;
      };

      if (message.id === 1) {
        send({ method: 'initialized' });
        send({
          id: 2,
          method: 'getAuthStatus',
          params: { includeToken: true, refreshToken: false },
        });
      }

      if (message.id === 2)
        message.error
          ? finish(new Error(unreadable))
          : finish(null, message.result);
    };

    child.on('error', () => finish(new Error(notInstalled)));
    child.on('exit', () => finish(new Error(unreadable)));
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines.filter(Boolean)) {
        try {
          handle(line);
        } catch {
          finish(new Error(unreadable));
        }
      }
    });
    send({
      id: 1,
      method: 'initialize',
      params: { clientInfo: { name: 'argo', title: 'Argo', version: '1' } },
    });
  });
}

// The real Codex: asked over its app-server each time, signed in only when it holds a ChatGPT login.
export function codexAppServerAuth(
  options: CodexAppServerOptions = {},
): CodexAuth {
  const { program = defaultProgram, timeoutMs = 10_000 } = options;

  return {
    read: async (): Promise<CodexReading> => {
      const found = findProgram(program);

      if (!found) return { signedIn: false, reason: notInstalled };

      try {
        const answer = await askAppServer(found, timeoutMs);

        return answer.authMethod === 'chatgpt' && answer.authToken
          ? { signedIn: true, token: answer.authToken }
          : { signedIn: false, reason: notSignedIn };
      } catch (error) {
        return {
          signedIn: false,
          reason: error instanceof Error ? error.message : unreadable,
        };
      }
    },
  };
}
