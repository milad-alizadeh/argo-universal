import { OperationExecution } from '@repo/contracts/operations/control';
import { startPermissionWaitHost } from '@repo/engine/mocks/operation-waits';
import { expect, it } from 'vitest';
import { callMcp, connectMcp, mcpValue } from '../mocks/mcp-client';
import { startCliHost } from '../mocks/operations-cli';

const projectList = 'project.list';

it('discovers only two tools over stdio, loads matching Operation schemas on demand and runs the same read as the App', async () => {
  const host = await startCliHost();
  const client = await connectMcp(host.home);
  const tools = await client.listTools();

  expect(tools.tools.map(({ name }) => name)).toEqual([
    'operation_list',
    'operation_run',
  ]);
  expect(JSON.stringify(tools)).not.toContain(projectList);

  const discovery = await client.callTool({
    name: 'operation_list',
    arguments: { filter: projectList },
  });

  expect(discovery.isError).not.toBe(true);
  expect(mcpValue(discovery)).toContainEqual(
    expect.objectContaining({
      id: projectList,
      params: expect.any(Object),
      tier: 'read',
      enabled: true,
    }),
  );
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

it('uses Argo confirmation and resumes the same work after the user refuses', async () => {
  const host = await startPermissionWaitHost();
  const client = await connectMcp(host.home, host.token);

  const response = await callMcp(client, {
    id: 'session.archive',
    params: host.target,
  });

  expect(response.isError).not.toBe(true);
  const pending = OperationExecution.parse(mcpValue(response));

  await host.permission();
  const waiting = callMcp(client, { waitId: pending.id });

  await host.waitStarted();
  host.advance(90_000);
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
  expect(await callMcp(client, { id: projectList })).not.toMatchObject({
    isError: true,
  });
}, 30_000);

it('completes a waiting write only after the user allows it', async () => {
  const host = await startPermissionWaitHost();
  const client = await connectMcp(host.home, host.token);

  const running = callMcp(client, {
    id: 'session.archive',
    params: host.target,
    wait: true,
  });

  await host.permission();
  await host.answer('allow_once');
  const response = await running;

  expect(response.isError).not.toBe(true);
  expect(mcpValue(response)).toEqual({ kind: 'result', result: {} });
}, 30_000);
