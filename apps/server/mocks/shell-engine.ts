import { writeFile } from 'node:fs/promises';
import { launchShellCommand } from '@repo/engine/shell-runtime';

const launch = {
  projectId: '',
  agentId: 'shell-mock',
  version: '',
  authContext: 'subscription',
  executable: process.execPath,
  args: [],
  cwd: process.cwd(),
  env: {},
};

process.on('SIGTERM', () => {});

const recordPids = (command: number, wrapper: number): Promise<void> =>
  writeFile(
    process.env.ARGO_FIXTURE_PIDFILE ?? '',
    JSON.stringify({ engine: process.pid, command, wrapper }),
  ).then(() => {
    process.send?.({ type: 'ready', port: 7337 });
  });

await launchShellCommand({
  launch,
  cwd: launch.cwd,
  home: process.env.ARGO_HOME ?? '',
  request: {
    sessionId: 'fixture',
    command: process.execPath,
    args: [
      '-e',
      "const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});console.log('command:'+child.pid+':'+process.ppid);setInterval(()=>{},1000)",
    ],
  },
  output: (chunk): void => {
    const match = chunk.toString().match(/command:(\d+):(\d+)/);

    if (match) void recordPids(Number(match[1]), Number(match[2]));
  },
});

setInterval(() => {}, 1000);
