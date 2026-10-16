import { spawn } from 'node:child_process';

export type Caffeinate = (enginePid: number) => () => void;

// Only idle system sleep is inhibited: display sleep and lid-close sleep remain available.
export const caffeinate: Caffeinate = (enginePid) => {
  if (process.platform !== 'darwin') return () => {};

  const child = spawn('/usr/bin/caffeinate', ['-i', '-w', String(enginePid)], {
    stdio: 'ignore',
  });

  child.on('error', (error) => console.error('caffeinate:', error));

  return () => {
    child.kill();
  };
};
