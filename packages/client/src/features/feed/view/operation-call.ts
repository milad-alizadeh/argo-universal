import type { ToolCallUpdate } from '@repo/contracts';
import type { IconName } from '@repo/contracts/kit-symbols';
import { operations } from '@repo/contracts/operations';
import { splitPluginOperationId } from '@repo/contracts/plugins/plugin-operations';
import { productCompatibility } from '@repo/contracts/product-identity';
import { z } from 'zod';

export interface OperationPresentation {
  label: string;
  icon: IconName;
}

const presentations = new Map<string, OperationPresentation>([
  ...Object.entries(operations),
  ['operations.list', { label: 'Discover Operations', icon: 'search' }],
  ['operations.wait', { label: 'Wait for Operation', icon: 'clock' }],
]);

const RunTarget = z.union([
  z.object({ id: z.string() }).transform(({ id }) => id),
  z.object({ waitId: z.string() }).transform(() => 'operations.wait'),
]);

const WrappedTarget = z
  .object({ arguments: RunTarget })
  .transform(({ arguments: target }) => target);

const Target = z.union([RunTarget, WrappedTarget]);

const McpTool = z.enum(['operation_run', 'operation_list']);

const McpInput = z.object({
  server: z.string(),
  tool: McpTool,
  arguments: z.unknown(),
});

function isArgoServer(server: string): boolean {
  const name = productCompatibility.mcpServer;

  return (
    server === name ||
    (server.startsWith(`${name}-`) &&
      /^[a-f0-9]{32}$/.test(server.slice(name.length + 1)))
  );
}

function mcpCall(
  row: ToolCallUpdate,
): { tool: z.infer<typeof McpTool>; arguments: unknown } | undefined {
  const wrapped = McpInput.safeParse(row.rawInput).data;

  return wrapped ? argoCall(wrapped) : bareCall(row);
}

function argoCall(
  input: z.infer<typeof McpInput>,
): z.infer<typeof McpInput> | undefined {
  return isArgoServer(input.server) ? input : undefined;
}

function bareCall(row: ToolCallUpdate): ReturnType<typeof mcpCall> {
  const tool = McpTool.safeParse(row.name).data;

  return tool ? { tool, arguments: row.rawInput } : undefined;
}

export function calledOperation(row: ToolCallUpdate): string | undefined {
  const call = mcpCall(row);

  if (!call) return row.name;

  return call.tool === 'operation_list'
    ? 'operations.list'
    : Target.safeParse(call.arguments).data;
}

export function operationPresentation(
  row: ToolCallUpdate,
): OperationPresentation | undefined {
  return (
    recordedOperation(row) ?? presentations.get(calledOperation(row) ?? '')
  );
}

export function recordedOperation(
  row: ToolCallUpdate,
): OperationPresentation | undefined {
  const icon = recordedIcon(row) ?? legacyPluginIcon(row);

  return icon ? { label: row.title, icon } : undefined;
}

export const recordedIcon = (row: ToolCallUpdate): IconName | undefined =>
  row._meta?.argo?.operationIcon;

function legacyPluginIcon(row: ToolCallUpdate): IconName | undefined {
  if (row.id !== `argo:${row.toolCallId}`) return undefined;

  return isPluginOperation(row.name) ? 'plugins' : undefined;
}

function isPluginOperation(name?: string): boolean {
  const id = name ?? '';

  return !presentations.has(id) && splitPluginOperationId(id) !== null;
}
