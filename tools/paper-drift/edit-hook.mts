import { existsSync } from 'node:fs';
import { z } from 'zod';
import {
  editWarnings,
  type EditTarget,
  type PaperEdit,
} from './edit-warning.mts';
import { readRegistry } from './registry.mts';
import { readSnapshot, registryPath, snapshotPath } from './workspace.mts';

// The hook after a Paper tool call: the input is read by shape, and the answer is context for the agent.
const WRITE_TOOLS = new Set([
  'delete_nodes',
  'duplicate_nodes',
  'move_nodes',
  'rename_nodes',
  'set_text_content',
  'update_styles',
  'write_html',
]);

// Strict, so a change in Paper's tool inputs is reported instead of read wrongly.
const nodeRef = z.strictObject({
  id: z.string().optional(),
  nodeId: z.string().optional(),
  nodeIds: z.array(z.string()).optional(),
  styles: z.record(z.string(), z.unknown()).optional(),
  name: z.string().optional(),
  textContent: z.string().optional(),
  parentId: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
  index: z.number().optional(),
});
type NodeRef = z.infer<typeof nodeRef>;
const toolInput = z.strictObject({
  fileId: z.string().optional(),
  pageId: z.string().optional(),
  nodeId: z.string().optional(),
  parentId: z.string().optional(),
  html: z.string().optional(),
  mode: z.string().optional(),
  nodeIds: z.array(z.string()).optional(),
  targetNodeId: z.string().optional(),
  updates: z.array(nodeRef).optional(),
  nodes: z.array(nodeRef).optional(),
  moves: z.array(nodeRef).optional(),
});
type ToolInput = z.infer<typeof toolInput>;
const hookInput = z.object({ tool_name: z.string(), tool_input: z.unknown() });

function refTargets(ref: NodeRef): EditTarget[] {
  const styles = Object.keys(ref.styles ?? {});
  const ids = [ref.id, ref.nodeId, ...(ref.nodeIds ?? [])];
  return ids
    .filter((id): id is string => id !== undefined)
    .map((nodeId): EditTarget => ({ nodeId, styles }));
}

function targetsOf(input: ToolInput): EditTarget[] {
  const refs = [input.updates, input.nodes, input.moves].flatMap(
    (list): NodeRef[] => list ?? [],
  );
  const direct = [
    input.targetNodeId,
    input.nodeId,
    ...(input.nodeIds ?? []),
  ].filter((id): id is string => id !== undefined);
  return [
    ...direct.map((nodeId): EditTarget => ({ nodeId, styles: [] })),
    ...refs.flatMap(refTargets),
  ];
}

// A tool name's last `__` segment, so the hook names no vendor prefix.
function shortName(toolName: string): string {
  return toolName.split('__').at(-1) ?? toolName;
}

function warn(lines: string[]): string | undefined {
  if (lines.length === 0) return undefined;
  return `Paper drift warning (from the last snapshot):\n- ${lines.join('\n- ')}`;
}

function warningsFor(edit: PaperEdit): string | undefined {
  if (!existsSync(snapshotPath) || !existsSync(registryPath))
    return 'Paper drift check skipped: there is no snapshot or registry yet. Run pnpm -F @repo/tools paper:snapshot.';
  return warn(editWarnings(readSnapshot(), readRegistry(registryPath), edit));
}

function editOf(tool: string, input: unknown): PaperEdit | string {
  const parsed = toolInput.safeParse(input);
  if (!parsed.success)
    return `Paper drift check skipped: unrecognised ${tool} input (${parsed.error.issues.length} issues).`;
  const targets = targetsOf(parsed.data);
  if (targets.length === 0)
    return `Paper drift check skipped: no layer ids in the ${tool} input.`;
  return { tool, targets };
}

function writeContext(tool: string, input: unknown): string | undefined {
  if (!WRITE_TOOLS.has(tool)) return undefined;
  const edit = editOf(tool, input);
  return typeof edit === 'string' ? edit : warningsFor(edit);
}

// Context to give the agent after a Paper tool call, if any; reads get none.
export function paperEditContext(raw: unknown): string | undefined {
  const parsed = hookInput.safeParse(raw);
  if (!parsed.success)
    return `Paper drift check skipped: unrecognised hook input (${parsed.error.issues.length} issues).`;
  return writeContext(shortName(parsed.data.tool_name), parsed.data.tool_input);
}
