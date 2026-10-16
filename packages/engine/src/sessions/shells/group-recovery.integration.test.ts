import { randomUUID } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { shell } from '@repo/db/schema';
import { descendantShellStep } from '@repo/mocks/agent/shell-scenarios';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { processIsRunning } from '#mocks/shell-process';
import { launchShellCommand } from '../../agents';
import { OwnedProcessRecord } from '../../lib/owned-process-record';
import { createShellOutput, shellOutputPath } from './files';

type InterruptedShell = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  created: { sessionId: string };
  recordPath: string;
  record: OwnedProcessRecord;
  pid: number;
  folder: string;
};

const startInterruptedShell = async (): Promise<InterruptedShell> => {
  const host = await startAcpEngine({ steps: [] });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Keep' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  host.database
    .insert(shell)
    .values({
      ...created,
      id: 'interrupted',
      toolCallId: 'tool',
      command: 'fixture',
      cwd: host.home,
      status: 'running',
      startedAt: Date.now(),
    })
    .run();
  const path = shellOutputPath(host.home, created.sessionId, 'interrupted');
  await createShellOutput(path);
  await writeFile(path, 'before interruption\n');
  const launch = requireScriptedProcessAt(host.agent.processes).launch;
  await host.stop();
  let output = '';

  const command = await launchShellCommand({
    home: host.home,
    cwd: launch.cwd,
    launch,
    request: { ...descendantShellStep.request, sessionId: 'owned-1' },
    output: (chunk): void => {
      output += chunk.toString();
    },
  });

  onTestFinished(async () => {
    command.kill();
    await command.exited;
  });
  await expect.poll(() => output).toMatch(/descendant:\d+/);
  const pid = Number(output.match(/descendant:(\d+)/)?.[1]);
  const folder = join(host.home, 'shell-processes');
  const names = await readdir(folder);
  const recordPath = join(folder, names[0] ?? 'missing');

  const record = OwnedProcessRecord.parse(
    JSON.parse(await readFile(recordPath, 'utf8')),
  );

  return { host, created, recordPath, record, pid, folder };
};

it('releases a recorded Shell group before Engine startup serves recovered Shells', async () => {
  const { host, created, record, pid, folder } = await startInterruptedShell();
  expect(processIsRunning(pid)).toBe(true);

  const restarted = await startEngineTestHost({
    home: host.home,
    acp: host.agent,
  });

  expect(processIsRunning(pid)).toBe(false);
  expect(processIsRunning(record.pid)).toBe(false);
  expect(await readdir(folder)).toEqual([]);
  expect(await restarted.caller.session.shells(created)).toMatchObject([
    { id: 'interrupted', status: 'lost', canStop: false },
  ]);
});

it('refuses recovery without signalling a group whose recorded identity changed', async () => {
  const { host, recordPath, record, pid } = await startInterruptedShell();
  await writeFile(
    recordPath,
    JSON.stringify({ ...record, token: randomUUID() }),
  );
  await expect(
    startEngineTestHost({ home: host.home, acp: host.agent }),
  ).rejects.toThrow('Actor terminated');
  expect(processIsRunning(pid)).toBe(true);
  expect(await readFile(recordPath, 'utf8')).toContain('token');
});
