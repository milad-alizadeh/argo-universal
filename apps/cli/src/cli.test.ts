import type {
  OperationExecution,
  OperationRow,
  OperationRunResponse,
} from '@repo/contracts/operations/control';
import type { AppRouter } from '@repo/engine/router';
import { TRPCClientError } from '@trpc/client';
import { expect, it } from 'vitest';
import { runArgo } from './cli';
import type { ControlClient, RunRequest } from './control-client';

const projectList = 'project.list';

const waitId = `call:session-1:${'a'.repeat(64)}`;

const running: OperationExecution = {
  kind: 'operation_execution',
  id: waitId,
  status: 'still_running',
};

const settled: OperationExecution = { ...running, status: 'settled' };

const row: OperationRow = {
  id: projectList,
  label: 'List Projects',
  description: 'Lists the Projects.',
  params: { type: 'object' },
  result: { type: 'array' },
  tier: 'read',
  keywords: [],
  enabled: true,
  disabledReason: null,
};

const unreachable = (): Promise<never> =>
  Promise.reject(new Error('The Server was reached'));

type Fake = { client: ControlClient; runs: RunRequest[] };

// A control client that answers from the test, recording each run it was asked for.
function fakeClient(answers: Partial<ControlClient> = {}): Fake {
  const runs: RunRequest[] = [];

  const run = (request: RunRequest): Promise<OperationRunResponse> => {
    runs.push(request);

    return (answers.run ?? unreachable)(request);
  };

  return {
    runs,
    client: { list: unreachable, wait: unreachable, ...answers, run },
  };
}

async function argo(
  argv: string[],
  client: ControlClient,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const code = await runArgo(argv, {
    write: (line) => stdout.push(line),
    writeError: (line) => stderr.push(line),
    client,
  });

  return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
}

it('prints an Operation result as JSON and exits 0', async () => {
  const { client, runs } = fakeClient({
    run: async () => ({ kind: 'result', result: [{ id: 'project-1' }] }),
  });

  const result = await argo(['run', projectList], client);

  expect(result).toMatchObject({ code: 0, stderr: '' });
  expect(JSON.parse(result.stdout)).toEqual([{ id: 'project-1' }]);
  expect(runs).toEqual([{ id: projectList, params: {}, wait: false }]);
});

it('passes any Operation id, its params and --wait on to the Server', async () => {
  const { client, runs } = fakeClient({
    run: async () => ({ kind: 'result', result: null }),
  });

  await argo(
    ['run', 'probe.refresh', '--params', '{"force":true}', '--wait'],
    client,
  );

  expect(runs).toEqual([
    { id: 'probe.refresh', params: { force: true }, wait: true },
  ]);
});

it('prints native work still running with exit 75', async () => {
  const { client } = fakeClient({ run: async () => running });

  const started = await argo(['run', 'session.new'], client);

  expect(started.code).toBe(75);
  expect(JSON.parse(started.stdout)).toEqual(running);
});

it('prints settled native work with exit 0', async () => {
  const { client } = fakeClient({ wait: async () => settled });

  const waited = await argo(['wait', waitId], client);

  expect(waited.code).toBe(0);
  expect(JSON.parse(waited.stdout)).toEqual(settled);
});

it('lists Operations as lines', async () => {
  const { client } = fakeClient({ list: async () => [row] });

  const lines = await argo(['operations', 'project'], client);

  expect(lines).toMatchObject({
    code: 0,
    stdout: 'project.list [read] — Lists the Projects.',
  });
});

it('lists Operations as JSON with --json', async () => {
  const { client } = fakeClient({ list: async () => [row] });

  const json = await argo(['operations', '--json'], client);

  expect(JSON.parse(json.stdout)).toEqual([row]);
});

it.each([
  [['run']],
  [['run', projectList, '--params', '{']],
  [['run', projectList, '--unknown']],
  [['run', '']],
  [['operations', 'first', 'second']],
  [['wait', 'not-a-wait-id']],
  [['mcp', 'unexpected']],
  [['nope']],
])('exits 2 for invalid usage %j without reaching the Server', async (argv) => {
  const { client, runs } = fakeClient();

  expect((await argo(argv, client)).code).toBe(2);
  expect(runs).toEqual([]);
});

it('exits 2 when the Server refuses an unknown Operation as a bad request', async () => {
  const refusal = TRPCClientError.from<AppRouter>({
    error: {
      code: -32600,
      message: 'Unknown Operation nope.thing. Run argo operations to find one.',
      data: { code: 'BAD_REQUEST', httpStatus: 400, path: 'operations.run' },
    },
  });

  const { client } = fakeClient({ run: () => Promise.reject(refusal) });

  const result = await argo(['run', 'nope.thing'], client);

  expect(result).toMatchObject({ code: 2, stdout: '' });
  expect(result.stderr).toContain('Unknown Operation nope.thing');
});

it('exits 1 and reports a Server it cannot reach', async () => {
  const { client } = fakeClient({
    run: () => Promise.reject(new Error('No Server found.')),
  });

  expect(await argo(['run', projectList], client)).toMatchObject({
    code: 1,
    stdout: '',
    stderr: 'Error: No Server found.',
  });
});
