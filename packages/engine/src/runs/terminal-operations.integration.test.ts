import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { createFakeTerminals, type FakeTerminal } from '#mocks/fake-terminals';
import { operationCaller, runOperation } from '#mocks/operations';

const send: OperationId = 'terminal.send';

const read: OperationId = 'terminal.read';

const web = { name: 'web', command: 'pnpm dev', ready: { pattern: 'Local:' } };

// An Engine whose terminals run nothing, with one Session on the Project's main checkout and a Run of `web` ready.
async function startReadyRun(): Promise<{
  terminal: FakeTerminal;
  call: (
    id: OperationId,
    params?: Record<string, Json>,
  ) => ReturnType<typeof runOperation>;
}> {
  const terminals = createFakeTerminals();

  const host = await startAcpEngine({
    steps: [],
    terminalSpawner: terminals.spawn,
  });

  const project = (await host.caller.project.list()).find(
    ({ id }) => id === 'project-1',
  );

  if (!project) throw new Error('No Project');
  await mkdir(join(project.path, '.argo'), { recursive: true });

  await writeFile(
    join(project.path, '.argo', 'run.json'),
    JSON.stringify({ configurations: [web] }),
  );
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  onTestFinished(terminals.end);
  const { operations } = await operationCaller(host);

  const call = (
    id: OperationId,
    params: Record<string, Json> = {},
  ): ReturnType<typeof runOperation> =>
    runOperation(operations, { id, params: { sessionId, ...params } });

  const started = call('run.start', { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local: http://localhost\r\n');
  await started;

  return { terminal, call };
}

it('types into a Run, and the effect shows in its output', async () => {
  const { terminal, call } = await startReadyRun();

  expect(await call(send, { name: 'web', input: 'r' })).toEqual({
    name: 'web',
    status: 'ready',
  });
  expect(terminal.written).toEqual(['r']);

  terminal.print('Reloading app\r\n');

  await expect(call('run.logs', { name: 'web' })).resolves.toMatchObject({
    output: expect.stringContaining('Reloading app'),
  });
});

it('reads the screen a Run shows now, as a terminal drew it', async () => {
  const { terminal, call } = await startReadyRun();
  terminal.print(
    '\u001B[2J\u001B[Hcompiling 10%\r\n\u001B[31mError: boom\u001B[0m',
  );
  terminal.print('\u001B[1;1H\u001B[2Kdone');

  const shown = await call(read, { name: 'web' });

  expect(shown).toMatchObject({ name: 'web', status: 'ready', exitCode: null });
  expect(shown).toMatchObject({ screen: 'done\nError: boom' });
});

it('reads the scrollback above the screen, the most recent lines when asked for fewer', async () => {
  const { terminal, call } = await startReadyRun();

  for (let line = 1; line <= 100; line += 1) terminal.print(`line ${line}\r\n`);

  const shown = await call(read, { name: 'web', scrollback: 3 });

  expect(shown).toMatchObject({ scrollback: 'line 67\nline 68\nline 69' });
  expect(shown).toMatchObject({ screen: expect.stringContaining('line 100') });
});

it('reads a Run that crashed, from what it recorded', async () => {
  const { terminal, call } = await startReadyRun();
  terminal.print('TypeError: boom\r\n');
  terminal.exit(3);

  await expect
    .poll(() => call(read, { name: 'web' }))
    .toMatchObject({
      status: 'crashed',
      exitCode: 3,
      screen: expect.stringContaining('TypeError: boom'),
    });
});

it('refuses to type into a Run that is not running', async () => {
  const { terminal, call } = await startReadyRun();
  terminal.exit(1);

  await expect
    .poll(() =>
      call(send, { name: 'web', input: 'r' }).then(
        () => 'sent',
        (error: Error): string => error.message,
      ),
    )
    .toMatch(/not running/);
});

it('refuses an unknown name', async () => {
  const { call } = await startReadyRun();

  await expect(call(send, { name: 'nope', input: 'r' })).rejects.toThrow(
    /No Run Configuration named "nope"/,
  );
});
