import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:net';
import { join } from 'node:path';
import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { createFakeTerminals } from '#mocks/fake-terminals';
import { operationCaller, runOperation } from '#mocks/operations';

const runFile = '.argo/run.json';

const startRun: OperationId = 'run.start';

const statusRun: OperationId = 'run.status';

type RunFile = string | Record<string, Json>;

const web = { name: 'web', command: 'pnpm dev', ready: { pattern: 'Local:' } };

const configure = async (directory: string, source: RunFile): Promise<void> => {
  await mkdir(join(directory, '.argo'), { recursive: true });
  await writeFile(
    join(directory, '.argo', 'run.json'),
    typeof source === 'string' ? source : JSON.stringify(source),
  );
};

type RunsJourney = Awaited<ReturnType<typeof startAcpEngine>> & {
  terminals: ReturnType<typeof createFakeTerminals>;
  project: { path: string };
  operations: Awaited<ReturnType<typeof operationCaller>>['operations'];
  call: (
    id: OperationId,
    params?: Record<string, Json>,
  ) => ReturnType<typeof runOperation>;
};

// An Engine whose terminals run nothing, with one Session on the Project's main checkout.
async function startRuns(source?: RunFile): Promise<RunsJourney> {
  const terminals = createFakeTerminals();

  const host = await startAcpEngine({
    steps: [],
    terminalSpawner: terminals.spawn,
  });

  const project = (await host.caller.project.list()).find(
    ({ id }) => id === 'project-1',
  );

  if (!project) throw new Error('No Project');

  if (source !== undefined) await configure(project.path, source);
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  onTestFinished(terminals.end);
  const { operations } = await operationCaller(host);

  const call: RunsJourney['call'] = (id, params = {}) =>
    runOperation(operations, { id, params: { sessionId, ...params } });

  return { ...host, terminals, project, operations, call };
}

it('starts a Run and returns its URL and port once its output says it is ready', async () => {
  const { terminals, call } = await startRuns({ configurations: [web] });

  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Starting\n');
  terminal.print('  Local: http://localhost\n');

  const result = await started;

  expect(terminal.launch.command).toBe('pnpm dev');
  expect(result).toEqual({
    ready: true,
    name: 'web',
    port: terminal.launch.port,
    url: `http://localhost:${terminal.launch.port}`,
  });
});

it('gives the Run its port as $PORT and $ARGO_PORT_0', async () => {
  const { terminals, call } = await startRuns({
    configurations: [{ ...web, env: { MODE: 'dev' } }],
  });

  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local:');
  await started;

  expect(terminal.launch.env).toEqual({
    MODE: 'dev',
    PORT: String(terminal.launch.port),
    ARGO_PORT_0: String(terminal.launch.port),
  });
});

it('runs the command in the Run Configuration’s folder of the Checkout', async () => {
  const { terminals, call, project } = await startRuns({
    configurations: [{ ...web, cwd: 'apps/web' }],
  });

  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local:');
  await started;

  expect(terminal.launch.cwd).toBe(join(project.path, 'apps/web'));
});

it('waits until the port is listening when the Run Configuration asks for that', async () => {
  const { terminals, call } = await startRuns({
    configurations: [
      { name: 'api', command: 'node api', ready: { port: true } },
    ],
  });

  const started = call(startRun, { name: 'api' });
  const terminal = await terminals.next();
  terminal.print('booting\n');
  await terminal.listen();

  await expect(started).resolves.toMatchObject({
    ready: true,
    port: terminal.launch.port,
  });
});

it('fills in the URL from the Run Configuration', async () => {
  const { terminals, call } = await startRuns({
    configurations: [{ ...web, url: 'http://localhost:$PORT/app' }],
  });

  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local:');

  await expect(started).resolves.toMatchObject({
    url: `http://localhost:${terminal.launch.port}/app`,
  });
});

it('returns the end of the output when the Run is not ready in time, and leaves it running', async () => {
  const { terminals, call } = await startRuns({ configurations: [web] });

  const started = call(startRun, { name: 'web', timeoutMs: 200 });
  const terminal = await terminals.next();
  terminal.print('\u001B[31mcompiling\u001B[0m\n');

  expect(await started).toEqual({
    ready: false,
    name: 'web',
    status: 'starting',
    exitCode: null,
    tail: 'compiling\n',
  });
  expect(terminal.stopped).toBe(false);
  expect(await call(statusRun)).toMatchObject({
    configurations: [{ name: 'web', status: 'starting' }],
  });
});

it('says a Run that exits before it is ready crashed, with its exit code and output', async () => {
  const { terminals, call } = await startRuns({ configurations: [web] });

  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Error: port in use\n');
  terminal.exit(1);

  expect(await started).toEqual({
    ready: false,
    name: 'web',
    status: 'crashed',
    exitCode: 1,
    tail: 'Error: port in use\n',
  });
});

it('keeps a crashed Run’s output and exit code', async () => {
  const { terminals, call } = await startRuns({ configurations: [web] });
  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local:\n');
  await started;

  terminal.print('TypeError: boom\n');
  terminal.exit(3);

  await expect
    .poll(() => call('run.logs', { name: 'web' }))
    .toEqual({
      name: 'web',
      status: 'crashed',
      exitCode: 3,
      output: 'Local:\nTypeError: boom\n',
    });
});

it('reads only the end of the output when asked for a tail', async () => {
  const { terminals, call } = await startRuns({ configurations: [web] });
  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local: abcdefghij');
  await started;

  expect(await call('run.logs', { name: 'web', tail: 4 })).toMatchObject({
    output: 'ghij',
  });
});

it('stops a Run with its whole terminal and lists it as stopped', async () => {
  const { terminals, call } = await startRuns({ configurations: [web] });
  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local:');
  await started;

  expect(await call('run.stop', { name: 'web' })).toEqual({
    name: 'web',
    status: 'stopped',
  });
  expect(terminal.stopped).toBe(true);

  expect(await call(statusRun)).toMatchObject({
    configurations: [{ name: 'web', status: 'stopped', exitCode: 143 }],
  });
});

it('restarts a Run: the old one ends and a new one starts and is waited for', async () => {
  const { terminals, call } = await startRuns({ configurations: [web] });
  const first = call(startRun, { name: 'web' });
  const old = await terminals.next();
  old.print('Local:');
  await first;

  const restarted = call('run.restart', { name: 'web' });
  const fresh = await terminals.next();
  fresh.print('Local:');

  expect(old.stopped).toBe(true);
  await expect(restarted).resolves.toMatchObject({
    ready: true,
    port: fresh.launch.port,
  });
});

it('lists each Run Configuration with the state of its Run', async () => {
  const { terminals, call } = await startRuns({
    configurations: [web, { name: 'api', command: 'node api' }],
  });

  expect(await call(statusRun)).toMatchObject({
    configurations: [
      { name: 'web', status: 'stopped', port: null },
      { name: 'api', status: 'stopped', port: null },
    ],
  });

  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();

  expect(await call(statusRun)).toMatchObject({
    configurations: [
      { name: 'web', status: 'starting', port: terminal.launch.port },
      { name: 'api', status: 'stopped' },
    ],
  });

  terminal.print('Local:');
  await started;

  expect(await call(statusRun)).toMatchObject({
    configurations: [
      {
        name: 'web',
        status: 'ready',
        command: 'pnpm dev',
        url: `http://localhost:${terminal.launch.port}`,
      },
      { name: 'api', status: 'stopped' },
    ],
  });
});

it('lists no Run Configurations when the Checkout has no file', async () => {
  const { call } = await startRuns();

  expect(await call(statusRun)).toEqual({ configurations: [] });
});

it('refuses a bad file with the place it is wrong, rather than listing none', async () => {
  const { call } = await startRuns(
    '{\n  "configurations": [{ "name": "web" }]\n}',
  );

  await expect(call(statusRun)).rejects.toThrow(
    /\.argo\/run\.json:2:\d+: configurations\.0\.command/,
  );
  await expect(call(startRun, { name: 'web' })).rejects.toThrow(
    /\.argo\/run\.json:2/,
  );
});

it('refuses an unknown name and says which Run Configurations exist', async () => {
  const { call } = await startRuns({ configurations: [web] });

  await expect(call(startRun, { name: 'nope' })).rejects.toThrow(
    /No Run Configuration named "nope".*web/,
  );
});

it('shares one Run between two Sessions on the same Checkout', async () => {
  const { terminals, call, operations, caller } = await startRuns({
    configurations: [web],
  });

  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local:');
  await started;
  const other = await caller.session.new(emptySessionInput);

  const again = await runOperation(operations, {
    id: 'run.start',
    params: { sessionId: other.sessionId, name: 'web' },
  });

  expect(terminals.started).toHaveLength(1);
  expect(again).toMatchObject({ ready: true, port: terminal.launch.port });
});

it('gives Runs of two Checkouts their own ports', async () => {
  const { terminals, call, operations, caller } = await startRuns({
    configurations: [{ name: 'web', command: 'x', ready: { pattern: 'up' } }],
  });

  const worktree = await caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'main' },
  });

  await configure(
    (await caller.session.get({ sessionId: worktree.sessionId })).checkout.path,
    {
      configurations: [{ name: 'web', command: 'x', ready: { pattern: 'up' } }],
    },
  );

  const first = call(startRun, { name: 'web' });
  const one = await terminals.next();
  one.print('up');
  await first;

  const second = runOperation(operations, {
    id: 'run.start',
    params: { sessionId: worktree.sessionId, name: 'web' },
  });

  const two = await terminals.next();
  two.print('up');
  await second;

  expect(one.launch.port).not.toBe(two.launch.port);
});

it('stops every Run when the Server stops', async () => {
  const { terminals, call, stop } = await startRuns({ configurations: [web] });
  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local:');
  await started;

  await stop();

  expect(terminal.stopped).toBe(true);
});

const listenOnFreePort = (): Promise<{ server: Server; port: number }> =>
  new Promise((resolve) => {
    const server = createServer();

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      resolve({
        server,
        port: typeof address === 'object' && address ? address.port : 0,
      });
    });
  });

// A port nothing listens on now; another process could take it before the test uses it, which is rare enough on a test machine.
const unusedPort = async (): Promise<number> => {
  const { server, port } = await listenOnFreePort();
  await new Promise((resolve) => server.close(resolve));

  return port;
};

it('gives a Run Configuration its own port as $PORT', async () => {
  const port = await unusedPort();

  const { terminals, call } = await startRuns({
    configurations: [{ ...web, port }],
  });

  const started = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local:');

  await expect(started).resolves.toMatchObject({
    ready: true,
    port,
    url: `http://localhost:${port}`,
  });
  expect(terminal.launch.env.PORT).toBe(String(port));
});

it('refuses a Run Configuration’s own port that something else listens on, and starts nothing', async () => {
  const { server, port } = await listenOnFreePort();
  onTestFinished(() => void server.close());

  const { terminals, call } = await startRuns({
    configurations: [{ ...web, port }],
  });

  await expect(call(startRun, { name: 'web' })).rejects.toThrow(
    new RegExp(`Port ${port} of Run Configuration "web" is already in use`),
  );
  expect(terminals.started).toHaveLength(0);
});

it('refuses a Run Configuration’s own port that a Run of another Checkout holds', async () => {
  const port = await unusedPort();
  const file = { configurations: [{ ...web, port }] };
  const { terminals, call, operations, caller } = await startRuns(file);

  const worktree = await caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'main' },
  });

  await configure(
    (await caller.session.get({ sessionId: worktree.sessionId })).checkout.path,
    file,
  );

  const first = call(startRun, { name: 'web' });
  const terminal = await terminals.next();
  terminal.print('Local:');
  await first;

  await expect(
    runOperation(operations, {
      id: startRun,
      params: { sessionId: worktree.sessionId, name: 'web' },
    }),
  ).rejects.toThrow(/already in use/);
});

it('starts a restarted Run on the port it had', async () => {
  const { terminals, call } = await startRuns({ configurations: [web] });
  const first = call(startRun, { name: 'web' });
  const old = await terminals.next();
  old.print('Local:');
  await first;

  const restarted = call('run.restart', { name: 'web' });
  const fresh = await terminals.next();
  fresh.print('Local:');
  await restarted;

  expect(fresh.launch.port).toBe(old.launch.port);
});

it('drafts .argo/run.json from the Checkout’s package.json and starts what it drafted', async () => {
  const { terminals, call, project } = await startRuns();
  const port = await unusedPort();

  await writeFile(
    join(project.path, 'package.json'),
    JSON.stringify({ scripts: { dev: `vite --port ${port}`, build: 'tsc' } }),
  );

  const drafted = await call('run.draft');

  expect(drafted).toEqual({
    path: runFile,
    configurations: [
      {
        name: 'dev',
        command: 'npm run dev',
        port,
        source: 'package.json',
      },
    ],
    skipped: [],
  });
  expect(await readFile(join(project.path, runFile), 'utf8')).toContain(
    '"npm run dev"',
  );
  expect(terminals.started).toEqual([]);

  const started = call(startRun, { name: 'dev' });
  const terminal = await terminals.next();

  expect(terminal.launch.command).toBe('npm run dev');
  await terminal.listen();
  await expect(started).resolves.toMatchObject({
    name: 'dev',
    ready: true,
    port,
  });
});

it('refuses to draft over an existing .argo/run.json unless asked', async () => {
  const { call, project } = await startRuns({ configurations: [web] });

  await writeFile(join(project.path, 'Procfile'), 'worker: node worker.js\n');

  await expect(call('run.draft')).rejects.toThrow(/already exists/u);

  await call('run.draft', { overwrite: true });

  expect(await readFile(join(project.path, runFile), 'utf8')).toContain(
    'worker',
  );
});
