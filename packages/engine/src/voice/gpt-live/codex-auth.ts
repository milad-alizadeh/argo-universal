import { resolveExecutable } from '@repo/executables';
import { askAppServer, notInstalled, unreadable } from './app-server-ask';
import type { AuthAnswer } from './app-server-ask';

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

const notSignedIn = 'Sign in to Codex with ChatGPT to talk with GPT-Live.';

const defaultTimeoutMs = 10_000;

const defaultProgram = (): string =>
  process.env.CODEX_PATH ?? resolveExecutable('codex');

const signedOut = (reason: string): CodexReading => ({
  signedIn: false,
  reason,
});

function findProgram(program: () => string): string | undefined {
  try {
    return program();
  } catch {
    return undefined;
  }
}

const readingOf = (answer: AuthAnswer): CodexReading =>
  answer.authMethod === 'chatgpt' && answer.authToken
    ? { signedIn: true, token: answer.authToken }
    : signedOut(notSignedIn);

const failedReading = (error: Error | string): CodexReading =>
  signedOut(error instanceof Error ? error.message : unreadable);

type Settings = Required<CodexAppServerOptions>;

async function readAuth(settings: Settings): Promise<CodexReading> {
  const program = findProgram(settings.program);

  if (!program) return signedOut(notInstalled);

  return askAppServer(program, settings.timeoutMs).then(
    readingOf,
    failedReading,
  );
}

// The real Codex: asked over its app-server each time, signed in only when it holds a ChatGPT login.
export function codexAppServerAuth(
  options: CodexAppServerOptions = {},
): CodexAuth {
  const settings = {
    program: defaultProgram,
    timeoutMs: defaultTimeoutMs,
    ...options,
  };

  return { read: () => readAuth(settings) };
}
