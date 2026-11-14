import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  OperationWaitId,
  type PluginInstruction,
  type OperationRow,
  type OperationRunResponse,
} from '@repo/contracts/operations/control';
import {
  productName,
  productCompatibility,
} from '@repo/contracts/product-identity';
import { z } from 'zod';
import { argoInstructions } from './argo-instructions';
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

// Argo's discovery line, then each Argo instruction and each Plugin's prose under its name, in the order given (the Server sends Plugin id order).
function mcpInstructions(plugins: PluginInstruction[]): string {
  return [
    discoveryInstructions,
    ...[...argoInstructions, ...plugins].map(
      ({ name, text }) => `## ${name}\n\n${text}`,
    ),
  ].join('\n\n');
}

export function createOperationMcpServer(
  client: ControlClient,
  plugins: PluginInstruction[] = [],
): McpServer {
  const server = new McpServer(
    { name: productCompatibility.mcpServer, version: '1.0.0' },
    { instructions: mcpInstructions(plugins) },
  );

  registerDiscovery(server, client);
  registerExecution(server, client);
  registerCreatePlugin(server);

  return server;
}

const discoveryInstructions =
  'Discover: call operation_list with a task-specific filter. ' +
  'Read the matching params schema and availability before calling operation_run.';

const discoveryTool = {
  description: `Find ${productName} Operations by id, label or keyword. Returns matching argument schemas, tiers and availability.`,
  inputSchema: z.strictObject({ filter: z.string().optional() }),
  annotations: { readOnlyHint: true, openWorldHint: false },
};

function registerDiscovery(server: McpServer, client: ControlClient): void {
  server.registerTool('operation_list', discoveryTool, async ({ filter }) =>
    result(await client.list(filter)),
  );
}

// The explicit way in, such as Claude Code's /mcp__argo__create-plugin: it names the Operations and holds none of their content.
const createPluginPrompt = {
  title: 'Create a Plugin',
  description: `Build a ${productName} Plugin: read the blueprint, then scaffold one.`,
};

const createPluginText =
  'Build an Argo Plugin. Run the plugin.guide Operation and read all of it, ' +
  'then run plugin.new, then follow the guide until its check passes.';

function registerCreatePlugin(server: McpServer): void {
  server.registerPrompt('create-plugin', createPluginPrompt, () => ({
    messages: [
      { role: 'user', content: { type: 'text', text: createPluginText } },
    ],
  }));
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
