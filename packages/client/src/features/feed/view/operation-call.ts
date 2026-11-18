import type { ToolCallUpdate } from '@repo/contracts';
import type { IconName } from '@repo/contracts/kit-symbols';
import {
  discoveryOperation,
  operationFeedRowId,
  operations,
} from '@repo/contracts/operations';
import {
  defaultPluginOperationIcon,
  splitPluginOperationId,
} from '@repo/contracts/plugins/plugin-operations';
import { isArgoMcpServer } from '@repo/contracts/product-identity';
import { z } from 'zod';

export interface OperationPresentation {
  label: string;
  icon: IconName;
}

const presentations = new Map<string, OperationPresentation>([
  ...Object.entries(operations),
  [discoveryOperation.id, discoveryOperation],
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

function mcpCall(
  row: ToolCallUpdate,
): { tool: z.infer<typeof McpTool>; arguments: unknown } | undefined {
  const wrapped = McpInput.safeParse(row.rawInput).data;

  return wrapped ? argoCall(wrapped) : bareCall(row);
}

function argoCall(
  input: z.infer<typeof McpInput>,
): z.infer<typeof McpInput> | undefined {
  return isArgoMcpServer(input.server) ? input : undefined;
}

function bareCall(row: ToolCallUpdate): ReturnType<typeof mcpCall> {
  const tool = McpTool.safeParse(row.name).data;

  return tool && allowsBareCall(row.title, tool)
    ? { tool, arguments: row.rawInput }
    : undefined;
}

function allowsBareCall(title: string, tool: string): boolean {
  const suffix = `: ${tool}`;

  return (
    !title.endsWith(suffix) || isArgoMcpServer(title.slice(0, -suffix.length))
  );
}

const identities = new WeakMap<ToolCallUpdate, { id: string | undefined }>();

export function calledOperation(row: ToolCallUpdate): string | undefined {
  const previous = identities.get(row);

  if (previous) return previous.id;
  const id = operationIdentity(row);

  identities.set(row, { id });

  return id;
}

function operationIdentity(row: ToolCallUpdate): string | undefined {
  const call = mcpCall(row);

  if (!call) return row.name;

  return call.tool === 'operation_list'
    ? discoveryOperation.id
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
  if (row.id !== operationFeedRowId(row.toolCallId)) return undefined;

  return isPluginOperation(row.name) ? defaultPluginOperationIcon : undefined;
}

function isPluginOperation(name?: string): boolean {
  const id = name ?? '';

  return !presentations.has(id) && splitPluginOperationId(id) !== null;
}
