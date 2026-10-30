import { resolveExecutable } from '@repo/executables';

// Under Electron, `process.execPath` is Electron itself, so a Node child runs on the Node in PATH.
export const nodeExecutable = (): string =>
  process.versions.electron === undefined
    ? process.execPath
    : resolveExecutable('node');

const withoutUndefined = (environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv =>
  Object.fromEntries(
    Object.entries(environment).filter(
      ([, value]): boolean => value !== undefined,
    ),
  );

// The parent's environment with `overrides` on top, an undefined override removing its variable; never ELECTRON_RUN_AS_NODE, which turns Electron into Node.
export const childEnvironment = (
  overrides: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv =>
  withoutUndefined({
    ...process.env,
    ...overrides,
    ELECTRON_RUN_AS_NODE: undefined,
  });
