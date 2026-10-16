import { processDescendants } from '../../lib/process-group-members';

const rejectSignalError = (error: Error): void => {
  if ('code' in error && error.code === 'ESRCH') return;
  throw error;
};

const signalProcess = (pid: number, signal: NodeJS.Signals): void => {
  try {
    process.kill(pid, signal);
  } catch (error) {
    if (error instanceof Error) rejectSignalError(error);
    else throw error;
  }
};

const freezeProcesses = (pids: number[]): void => {
  for (const pid of pids) signalProcess(pid, 'SIGSTOP');
};

const freezeDescendants = (pid: number): number[] => {
  let descendants = processDescendants(pid);

  while (true) {
    freezeProcesses(descendants);
    const frozen = new Set(descendants);
    descendants = processDescendants(pid);

    if (descendants.every((descendant) => frozen.has(descendant)))
      return descendants;
  }
};

export const terminateShellTree = (pid: number): void => {
  signalProcess(pid, 'SIGSTOP');

  try {
    const descendants = freezeDescendants(pid);

    for (const descendant of descendants.toReversed())
      signalProcess(descendant, 'SIGKILL');
  } finally {
    signalProcess(pid, 'SIGKILL');
  }
};
