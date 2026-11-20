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

// An operation_run call that names no Operation, such as one the Agent sent before loading its schema.
const untargetedRun = 'operations.run';

const presentations = new Map<string, OperationPresentation>([
  ...Object.entries(operations),
  [discoveryOperation.id, discoveryOperation],
  ['operations.wait', { label: 'Wait for Operation', icon: 'clock' }],
  [untargetedRun, { label: 'Run Operation', icon: 'tool' }],
]);

const RunTarget = z.union([
  z.object({ id: z.string() }).transform(({ id }) => id),
  z.object({ waitId: z.string() }).transform(() => 'operations.wait'),
]);

const WrappedTarget = z
  .object({ arguments: RunTarget })
  .transform(({ arguments: target }) => target);

const Target = z.union([RunTarget, WrappedTarget]).catch(untargetedRun);

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

// The Operation an Agent's operation_run call names and the params it passes; the Engine's own row has the same two.
export function agentOperationCall(
  row: ToolCallUpdate,
): { id: string; params: unknown } | undefined {
  if (row.id === operationFeedRowId(row.toolCallId)) return undefined;
  const call = mcpCall(row);

  if (call?.tool !== 'operation_run') return undefined;
  const target = z
    .object({ id: z.string(), params: z.unknown() })
    .safeParse(call.arguments);

  return target.success
    ? { id: target.data.id, params: target.data.params ?? {} }
    : undefined;
}

function operationIdentity(row: ToolCallUpdate): string | undefined {
  const call = mcpCall(row);

  if (!call) return row.name;

  return call.tool === 'operation_list'
    ? discoveryOperation.id
    : Target.parse(call.arguments);
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
