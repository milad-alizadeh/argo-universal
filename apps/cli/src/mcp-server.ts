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
  'Use operation_list to find Argo Operations and their argument schemas. ' +
  'Use operation_run to run one. Argo enforces Session scope and asks for confirmation when required. ' +
  'Each wait returns within thirty seconds. ' +
  'For work still running, pass its returned id as waitId to operation_run. Do not restart the Operation.';

const discoveryTool = {
  description:
    'Find Argo Operations by id, label or keyword. Returns matching descriptions, argument schemas, tiers and availability. Use a filter to keep results small.',
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
    'Run an Argo Operation discovered with operation_list. Supply id, params and optional wait. ' +
    'If work is still running or waiting for the user, observe it by supplying only waitId from its returned id. ' +
    'Waiting never restarts or cancels work. Report a user refusal and stop that Operation.',
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
