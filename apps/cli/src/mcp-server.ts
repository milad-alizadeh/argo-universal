import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  OperationWaitId,
  type OperationRow,
  type OperationRunResponse,
} from '@repo/contracts/operations/control';
import { z } from 'zod';
import type { ControlClient } from './control-client';

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

const operationInput = z.object({
  id: z.string().min(1),
  params: z.json().default({}),
  wait: z.boolean().default(false),
});

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

// Two tools share the CLI's authenticated control client; Operation schemas are discovered on demand.
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
  annotations: { readOnlyHint: false, openWorldHint: false },
};

function registerExecution(server: McpServer, client: ControlClient): void {
  server.registerTool('operation_run', executionTool, async (input) =>
    result(await execute(client, input)),
  );
}

function execute(
  client: ControlClient,
  input: z.infer<typeof runInput>,
): ReturnType<ControlClient['run']> {
  if (input.waitId !== undefined) return client.wait(input.waitId);

  return client.run(operationInput.parse(input));
}
