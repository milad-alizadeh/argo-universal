import { releaseShellGroups } from '@repo/engine/shell-runtime';
import type { EngineChild } from './engine-process';
import { releaseProcessGroup } from './process-group';

type Outcome = 'released' | 'unresolved';

type Termination = {
  child: EngineChild;
  exited: Promise<void>;
  hasExited: () => boolean;
  release: () => Promise<Outcome>;
  timeout: number;
};

const releaseEngineGroups = async (
  pid: number,
  home: string,
): Promise<Outcome> => {
  if ((await releaseProcessGroup(pid)) !== 'released') return 'unresolved';

  try {
    await releaseShellGroups(home);

    return 'released';
  } catch {
    return 'unresolved';
  }
};

// Both the kill timer and Engine exit share a release: concurrent releases would race on Shell records.
const groupRelease = (
  child: EngineChild,
  home: string,
): (() => Promise<Outcome>) => {
  let releasing: Promise<Outcome> | undefined;

  return (): Promise<Outcome> => {
    if (child.pid === undefined) return Promise.resolve('released');

    releasing ??= releaseEngineGroups(child.pid, home).finally((): void => {
      releasing = undefined;
    });

    return releasing;
  };
};

const hasExited = (child: EngineChild): boolean =>
  child.exitCode !== null || child.signalCode !== null;

const waitForExit = (child: EngineChild): Promise<void> =>
  new Promise<void>((resolve): void => {
    if (hasExited(child)) resolve();
    else child.once('exit', (): void => resolve());
  });

const terminate = async (state: Termination): Promise<Outcome> => {
  if (!state.hasExited()) await stopEngine(state);

  return state.release();
};

// Asks the Engine to stop, kills its group after the timeout, then proves the whole group is gone.
const stopEngine = async (state: Termination): Promise<void> => {
  state.child.kill('SIGTERM');
  const forceKill = setTimeout((): void => void state.release(), state.timeout);
  await state.exited;
  clearTimeout(forceKill);
};

export const engineTerminator = (
  child: EngineChild,
  home: string,
  timeout: number,
): (() => Promise<Outcome>) => {
  const state = {
    child,
    exited: waitForExit(child),
    hasExited: (): boolean => hasExited(child),
    release: groupRelease(child, home),
    timeout,
  };

  return (): Promise<Outcome> => terminate(state);
};
