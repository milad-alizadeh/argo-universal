import { mkdir, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { join } from 'node:path';
import { RunLogsResult, RunStartResult } from '@repo/contracts';
import { isAlive } from '@repo/process';
import { expect, it, onTestFinished, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { operationCaller, runOperation } from '#mocks/operations';
import type { RunConfiguration } from './run-configurations';

// The real terminal behind the Operations: no spawner is substituted.
async function startRealRun(
  configuration: Pick<RunConfiguration, 'name' | 'command' | 'ready'>,
  files: Record<string, string> = {},
): Promise<{
  start: () => ReturnType<typeof runOperation>;
  stop: () => ReturnType<typeof runOperation>;
  logs: () => ReturnType<typeof runOperation>;
}> {
  vi.stubEnv('SHELL', '/bin/bash');
  onTestFinished(() => void vi.unstubAllEnvs());
  const host = await startAcpEngine({ steps: [] });

  const project = (await host.caller.project.list()).find(
    ({ id }) => id === 'project-1',
  );

  if (!project) throw new Error('No Project');
  await mkdir(join(project.path, '.argo'), { recursive: true });
  await writeFile(
    join(project.path, '.argo', 'run.json'),
    JSON.stringify({ configurations: [configuration] }),
  );

  for (const [name, content] of Object.entries(files))
    await writeFile(join(project.path, name), content);

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  const { operations } = await operationCaller(host);
  const params = { sessionId, name: configuration.name };

  return {
    start: () => runOperation(operations, { id: 'run.start', params }),
    stop: () => runOperation(operations, { id: 'run.stop', params }),
    logs: () => runOperation(operations, { id: 'run.logs', params }),
  };
}

it('records a real Run’s output and makes its real exit code Crashed', async () => {
  const run = await startRealRun({
    name: 'boom',
    command: 'echo compiling; exit 3',
  });

  expect(await run.start()).toMatchObject({
    ready: false,
    status: 'crashed',
    exitCode: 3,
    tail: expect.stringContaining('compiling'),
  });
  expect(await run.logs()).toMatchObject({
    status: 'crashed',
    exitCode: 3,
    output: expect.stringContaining('compiling'),
  });
}, 30_000);

const stubbornProcessTree = `
const { spawn } = require('node:child_process');
const { createServer } = require('node:net');
process.on('SIGTERM', () => {});
if (process.argv[2] === 'listener') {
  createServer().listen(Number(process.env.PORT), '127.0.0.1', () => {
    console.log('Listening: ' + process.argv[3] + ' ' + process.ppid + ' ' + process.pid);
  });
} else {
  spawn(process.execPath, [__filename, 'listener', String(process.ppid)], { stdio: 'inherit' });
}
`;

const canConnect = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = connect(port, '127.0.0.1');
    socket.once('error', () => resolve(false));
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
  });

it('stops the Run’s real process group and listener through run.stop', async () => {
  const run = await startRealRun(
    {
      name: 'stubborn',
      command: `${JSON.stringify(process.execPath)} tree.cjs; exit $?`,
      ready: { pattern: 'Listening: \\d+ \\d+ \\d+' },
    },
    { 'tree.cjs': stubbornProcessTree },
  );
  const started = RunStartResult.parse(await run.start());
  if (!started.ready) throw new Error('The Run did not report its port');

  const { output } = RunLogsResult.parse(await run.logs());
  const group = /Listening: (\d+) (\d+) (\d+)/u.exec(output);
  if (!group) throw new Error('The Run did not report its processes');
  const pids = group.slice(1).map(Number);

  await expect(canConnect(started.port)).resolves.toBe(true);
  expect(pids.map(isAlive)).toEqual([true, true, true]);
  await expect(run.stop()).resolves.toMatchObject({ status: 'stopped' });
  await expect(canConnect(started.port)).resolves.toBe(false);
  await expect.poll(() => pids.map(isAlive)).toEqual([false, false, false]);
}, 30_000);
