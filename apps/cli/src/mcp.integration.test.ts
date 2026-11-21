import { OperationExecution } from '@repo/contracts/operations/control';
import {
  chartPreviewImage,
  connectChartPreviewApp,
} from '@repo/engine/mocks/chart-preview-app';
import { startPermissionWaitHost } from '@repo/engine/mocks/operation-waits';
import {
  capturedImage,
  connectScreenSightApp,
} from '@repo/engine/mocks/screen-sight-app';
import { expect, it } from 'vitest';
import { callMcp, connectMcp, mcpValue } from '../mocks/mcp-client';
import { startCliHost } from '../mocks/operations-cli';

const projectList = 'project.list';

const archiveSession = 'session.archive';

it('advertises exactly two tools without loading Operation definitions', async () => {
  const host = await startCliHost();
  const client = await connectMcp(host.home);
  const tools = await client.listTools();

  expect(tools.tools.map(({ name }) => name)).toEqual([
    'operation_list',
    'operation_run',
  ]);
  expect(JSON.stringify(tools)).not.toContain(projectList);
}, 30_000);

it('discovers matching Operation argument schemas on demand', async () => {
  const host = await startCliHost();
  const client = await connectMcp(host.home);

  const discovery = await client.callTool({
    name: 'operation_list',
    arguments: { filter: projectList },
  });

  expect(discovery.isError).not.toBe(true);
  expect(mcpValue(discovery)).toContainEqual(
    expect.objectContaining({
      id: projectList,
      params: expect.any(Object),
      result: expect.any(Object),
      policy: 'allow',
      enabled: true,
    }),
  );
}, 30_000);

it('runs the same read as the App', async () => {
  const host = await startCliHost();
  const client = await connectMcp(host.home);

  const read = await callMcp(client, { id: projectList, wait: true });

  expect(read.isError).not.toBe(true);
  expect(read.content).toEqual([
    {
      type: 'text',
      text: JSON.stringify({
        kind: 'result',
        result: await host.caller.project.list(),
      }),
    },
  ]);
}, 30_000);

it('returns only the exact input schema and availability for a known id', async () => {
  const host = await startCliHost();
  const client = await connectMcp(host.home);
  const id = 'session.new';

  const schema = await client.callTool({
    name: 'operation_list',
    arguments: { id },
  });

  expect(schema.isError).not.toBe(true);
  expect(mcpValue(schema)).toEqual([
    expect.objectContaining({
      id,
      enabled: true,
      params: expect.objectContaining({
        properties: expect.objectContaining({
          configOptions: expect.objectContaining({
            type: 'array',
            items: expect.objectContaining({
              required: ['configId', 'value'],
              additionalProperties: false,
            }),
          }),
        }),
      }),
    }),
  ]);

  expect(mcpValue(schema)).not.toEqual([
    expect.objectContaining({ result: expect.anything() }),
  ]);
}, 30_000);

it('does not return fuzzy matches for an unknown exact id', async () => {
  const host = await startCliHost();
  const client = await connectMcp(host.home);

  const discovery = await client.callTool({
    name: 'operation_list',
    arguments: { id: 'session.ne' },
  });

  expect(discovery.isError).not.toBe(true);
  expect(mcpValue(discovery)).toEqual([]);
}, 30_000);

it.each([
  {
    configOptions: { reasoning_effort: 'medium' },
    path: 'configOptions',
    message: 'expected array',
  },
  {
    configOptions: [
      { configId: 'reasoning_effort', type: 'select', value: 'medium' },
    ],
    path: 'configOptions[0]',
    message: 'Unrecognized key: "type"',
  },
])(
  'reports $path for an invalid creation override',
  async ({ configOptions, path, message }) => {
    const host = await startCliHost();
    const client = await connectMcp(host.home);

    const response = await callMcp(client, {
      id: 'session.new',
      params: { configOptions },
    });

    expect(response.isError).toBe(true);
    expect(response.content).toContainEqual({
      type: 'text',
      text: expect.stringContaining(path),
    });

    expect(response.content).toContainEqual({
      type: 'text',
      text: expect.stringContaining(message),
    });
  },
  30_000,
);

it('keeps a supplied Session token authoritative instead of falling back to the user token', async () => {
  const host = await startCliHost();
  const client = await connectMcp(host.home, 'revoked-session-token');
  const response = await callMcp(client, { id: projectList });

  expect(response.isError).toBe(true);
  expect(JSON.stringify(response)).not.toContain('revoked-session-token');
  expect(await host.caller.project.list()).toContainEqual(
    expect.objectContaining({ id: 'project-1' }),
  );
}, 30_000);

it('rejects ambiguous wait requests without starting the Operation', async () => {
  const host = await startCliHost();
  const client = await connectMcp(host.home);

  const response = await callMcp(client, {
    id: 'agent.setAccess',
    params: { enabled: false },
    waitId: `call:session-1:${'a'.repeat(64)}`,
  });

  expect(response.isError).toBe(true);
  expect(await host.caller.agent.getAccess()).toEqual({ enabled: true });
}, 30_000);

it('reports the user refusal when observing previously started work', async () => {
  const host = await startPermissionWaitHost();
  const client = await connectMcp(host.home, host.token);

  const response = await callMcp(client, {
    id: archiveSession,
    params: host.target,
  });

  expect(response.isError).not.toBe(true);
  const pending = OperationExecution.parse(mcpValue(response));

  await host.permission();
  const waiting = callMcp(client, { waitId: pending.id });

  await host.waitStarted();
  host.advance(30_000);
  expect(await waiting).toMatchObject({
    content: [
      { type: 'text', text: expect.stringContaining('waiting_for_user') },
    ],
  });
  await host.answer('reject_once');
  expect(await callMcp(client, { waitId: pending.id })).toMatchObject({
    isError: true,
    content: [
      { type: 'text', text: expect.stringContaining('The user refused') },
    ],
  });
}, 30_000);

it('completes a waiting write only after the user allows it', async () => {
  const host = await startPermissionWaitHost();
  const client = await connectMcp(host.home, host.token);

  const running = callMcp(client, {
    id: archiveSession,
    params: host.target,
    wait: true,
  });

  await host.permission();
  await host.answer('allow_once');
  const response = await running;

  expect(response.isError).not.toBe(true);
  expect(mcpValue(response)).toEqual({ kind: 'result', result: {} });
}, 30_000);

it('returns resumable work at thirty seconds without cancelling the Operation', async () => {
  const host = await startPermissionWaitHost();
  const client = await connectMcp(host.home, host.token);

  const running = callMcp(client, {
    id: archiveSession,
    params: host.target,
    wait: true,
  });

  await host.permission();
  await host.waitStarted();
  host.advance(30_000);
  const pending = OperationExecution.parse(mcpValue(await running));

  expect(pending.status).toBe('waiting_for_user');
  await host.answer('allow_once');
  expect(mcpValue(await callMcp(client, { waitId: pending.id }))).toMatchObject(
    {
      id: pending.id,
      status: 'settled',
      result: {},
    },
  );
}, 30_000);

it('hands an Agent a captured screen as an image, not as text', async () => {
  const host = await startCliHost();
  const app = connectScreenSightApp(host.url);
  await app.ready;
  const client = await connectMcp(host.home);

  const seen = await callMcp(client, { id: 'app.screenshot', params: {} });

  expect(seen.content).toEqual([
    {
      type: 'text',
      text: JSON.stringify({ kind: 'result', result: { status: 'captured' } }),
    },
    { type: 'image', data: capturedImage.data, mimeType: 'image/png' },
  ]);
}, 30_000);

it('hands the Agent a Chart PNG and its render metadata as separate content', async () => {
  const host = await startCliHost();
  const app = connectChartPreviewApp(host.url);

  await app.ready;

  const client = await connectMcp(host.home);

  const fence = [
    '```chart',
    '{"kind":"line","label":"Orders","series":[{"name":"Orders","tone":"info","points":[{"x":1,"y":8}]}]}',
    '```',
  ].join('\n');

  const seen = await callMcp(client, {
    id: 'chart.preview',
    params: { fence, width: 360, theme: 'dark' },
    wait: true,
  });

  expect(seen.content).toEqual([
    {
      type: 'text',
      text: JSON.stringify({
        kind: 'result',
        result: {
          valid: true,
          status: 'captured',
          platform: 'web',
          width: 360,
          theme: 'dark',
        },
      }),
    },
    { type: 'image', ...chartPreviewImage },
  ]);
}, 30_000);
