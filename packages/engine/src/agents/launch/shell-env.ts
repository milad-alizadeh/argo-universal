import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);

const fallbackEnvironment = (
  cwd: string,
  cause: unknown,
): NodeJS.ProcessEnv => {
  console.error(
    `Could not read login-shell environment in ${cwd}; using Engine environment`,
    cause instanceof Error ? cause.message : String(cause),
  );

  return { ...process.env };
};

// Anything an rc file prints comes before the marker; NUL-separated entries keep multi-line values whole.
const environmentMarker = '__ARGO_LOGIN_ENVIRONMENT__';

const loginShellArguments = [
  '-l',
  '-i',
  '-c',
  `printf '%s' ${environmentMarker}; /usr/bin/env -0`,
];

const environments = new Map<string, Promise<NodeJS.ProcessEnv>>();

const environmentEntry = (entry: string): [string, string][] => {
  const separator = entry.indexOf('=');

  return separator > 0
    ? [[entry.slice(0, separator), entry.slice(separator + 1)]]
    : [];
};

const capturedEnvironment = (stdout: string): Record<string, string> => {
  const marker = stdout.lastIndexOf(environmentMarker);

  if (marker < 0) throw new Error('The login shell printed no environment');

  return Object.fromEntries(
    stdout
      .slice(marker + environmentMarker.length)
      .split('\0')
      .flatMap(environmentEntry),
  );
};

// Starting from the Engine's env keeps its Node type; only the names the login shell printed survive.
const loginOnly = (captured: Record<string, string>): NodeJS.ProcessEnv => {
  const environment = { ...process.env };

  for (const key of Object.keys(environment))
    if (!Object.hasOwn(captured, key)) delete environment[key];

  return Object.assign(environment, captured);
};

const parseEnvironment = (stdout: string): NodeJS.ProcessEnv => {
  const captured = capturedEnvironment(stdout);

  if (!Object.hasOwn(captured, 'PATH'))
    throw new Error('The login shell printed no PATH');

  return loginOnly(captured);
};

const loginShell = (): string => process.env.SHELL ?? '/bin/sh';

const runLoginShell = async (cwd: string): Promise<string> => {
  const running = execute(loginShell(), loginShellArguments, { cwd });

  // An rc file that reads stdin gets end-of-file instead of waiting forever.
  running.child.stdin?.end();

  return (await running).stdout;
};

const readEnvironment = async (cwd: string): Promise<NodeJS.ProcessEnv> => {
  try {
    return parseEnvironment(await runLoginShell(cwd));
  } catch (error) {
    return fallbackEnvironment(cwd, error);
  }
};

export const shellEnvironment = (cwd: string): Promise<NodeJS.ProcessEnv> => {
  const existing = environments.get(cwd);

  if (existing) return existing;
  const environment = readEnvironment(cwd);
  environments.set(cwd, environment);

  return environment;
};
