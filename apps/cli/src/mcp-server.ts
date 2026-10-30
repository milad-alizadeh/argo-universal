import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  OperationWaitId,
  type OperationRow,
  type OperationRunResponse,
} from '@repo/contracts/operations/control';
import { z } from 'zod';
import type { ControlClient, RunRequest } from './control-client';

const mcpWaitMs = 30_000;

type McpExecution =
  | { kind: 'run'; request: RunRequest }
  | { kind: 'wait'; id: string };

const runFields = z.strictObject({
  id: z.string().min(1).optional(),
  params: z.json().optional(),
  wait: z.boolean().optional(),
  waitId: OperationWaitId.optional(),
});

const runInput = runFields.refine(
  validRunInput,
  'Supply an Operation id, or a waitId alone to observe existing work.',
);

function validRunInput(input: z.infer<typeof runFields>): boolean {
  if (input.waitId === undefined) return input.id !== undefined;

  return [input.id, input.params, input.wait].every(
    (value) => value === undefined,
  );
}

const result = (
  value: OperationRow[] | OperationRunResponse,
): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value) }],
});

export function createOperationMcpServer(client: ControlClient): McpServer {
  const server = new McpServer(
    { name: 'argo', version: '1.0.0' },
    { instructions },
  );

  registerDiscovery(server, client);
  registerExecution(server, client);

  return server;
}

const instructions =
  'Discover: call operation_list with a task-specific filter. ' +
  'Read the matching params schema and availability before calling operation_run.';

const discoveryTool = {
  description:
    'Find Argo Operations by id, label or keyword. Returns matching argument schemas, tiers and availability.',
  inputSchema: z.strictObject({ filter: z.string().optional() }),
  annotations: { readOnlyHint: true, openWorldHint: false },
};

function registerDiscovery(server: McpServer, client: ControlClient): void {
  server.registerTool('operation_list', discoveryTool, async ({ filter }) =>
    result(await client.list(filter)),
  );
}

const executionTool = {
  description:
    'Run a discovered Operation with id and params. Set wait=true when you need its completed result. ' +
    'Treat kind=result or status=settled as completion. ' +
    'For still_running or waiting_for_user, poll with only waitId set to the latest returned id. ' +
    'Report the result or cancellation. On refusal, report it and stop that Operation.',
  inputSchema: runInput,
  annotations: { readOnlyHint: false, openWorldHint: true },
};

function registerExecution(server: McpServer, client: ControlClient): void {
  server.registerTool('operation_run', executionTool, async (input) =>
    result(await execute(client, executionInput(input))),
  );
}

function execute(
  client: ControlClient,
  input: McpExecution,
): ReturnType<ControlClient['run']> {
  if (input.kind === 'wait') return client.wait(input.id, mcpWaitMs);

  return client.run(input.request);
}

function executionInput(input: z.infer<typeof runInput>): McpExecution {
  if (input.waitId !== undefined) return { kind: 'wait', id: input.waitId };

  if (input.id === undefined) throw new Error('An Operation id is required.');

  return { kind: 'run', request: runRequest(input.id, input) };
}

function runRequest(id: string, input: z.infer<typeof runInput>): RunRequest {
  return {
    id,
    params: input.params === undefined ? {} : input.params,
    wait: input.wait ?? false,
    timeoutMs: mcpWaitMs,
  };
}
