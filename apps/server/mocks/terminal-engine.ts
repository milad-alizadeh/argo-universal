import { writeFile } from 'node:fs/promises';
import { launchLoginTerminal } from '@repo/engine/login-terminal-runtime';

const launch = {
  projectId: '',
  agentId: 'terminal-mock',
  version: '',
  authContext: 'subscription',
  executable: process.execPath,
  args: [
    '-e',
    "process.on('SIGHUP',()=>{}); process.on('SIGTERM',()=>{}); console.log('terminal:'+process.pid+':'+process.ppid); setInterval(()=>{},1000);",
  ],
  cwd: process.cwd(),
  env: {},
};

process.on('SIGTERM', () => {});

const recordPids = (terminal: number, wrapper: number): Promise<void> =>
  writeFile(
    process.env.ARGO_FIXTURE_PIDFILE ?? '',
    JSON.stringify({ engine: process.pid, terminal, wrapper }),
  ).then(() => {
    process.send?.({ type: 'ready', port: 7337 });
  });

void launchLoginTerminal(launch, (text) => {
  const match = text.match(/terminal:(\d+):(\d+)/);

  if (!match) return;
  void recordPids(Number(match[1]), Number(match[2]));
});

setInterval(() => {}, 1000);
