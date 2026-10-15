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

const loginShellArguments = ['-l', '-i', '-c', 'env'];

const environments = new Map<string, Promise<NodeJS.ProcessEnv>>();

const environmentEntry = (line: string): [string, string][] => {
  const separator = line.indexOf('=');

  return separator > 0
    ? [[line.slice(0, separator), line.slice(separator + 1)]]
    : [];
};

const parseEnvironment = (stdout: string): NodeJS.ProcessEnv => {
  const captured = Object.fromEntries(
    stdout.split('\n').flatMap(environmentEntry),
  );

  const environment = { ...process.env };

  for (const key of Object.keys(environment))
    if (!Object.hasOwn(captured, key)) delete environment[key];

  return Object.assign(environment, captured);
};

const readEnvironment = async (cwd: string): Promise<NodeJS.ProcessEnv> => {
  try {
    const { stdout } = await execute(
      process.env.SHELL ?? '/bin/sh',
      loginShellArguments,
      { cwd },
    );

    return parseEnvironment(stdout);
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
