// Read docs/agents/paper.md before changing this hook. It warns and never blocks.
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { editWarnings, type PaperEdit } from './paper-drift/edit-warning.mts';
import { readRegistry } from './paper-drift/registry.mts';
import {
  readSnapshot,
  registryPath,
  snapshotPath,
} from './paper-drift/workspace.mts';

const nodeRef = z.looseObject({
  id: z.string().optional(),
  nodeId: z.string().optional(),
  nodeIds: z.array(z.string()).optional(),
});
const hookInput = z.looseObject({
  tool_name: z.string(),
  tool_input: z
    .looseObject({
      nodeIds: z.array(z.string()).optional(),
      targetNodeId: z.string().optional(),
      updates: z.array(nodeRef).optional(),
      nodes: z.array(nodeRef).optional(),
      moves: z.array(nodeRef).optional(),
    })
    .default({}),
});
type HookInput = z.infer<typeof hookInput>;
type NodeRef = z.infer<typeof nodeRef>;

function refIds(ref: NodeRef): string[] {
  return [ref.id, ref.nodeId, ...(ref.nodeIds ?? [])].filter(
    (id): id is string => id !== undefined,
  );
}

function editOf({ tool_name: tool, tool_input: input }: HookInput): PaperEdit {
  const refs = [input.updates, input.nodes, input.moves].flatMap(
    (list): NodeRef[] => list ?? [],
  );
  const direct = [input.targetNodeId, ...(input.nodeIds ?? [])].filter(
    (id): id is string => id !== undefined,
  );
  return {
    tool: tool.replace(/^mcp__paper__/, ''),
    nodeIds: [...direct, ...refs.flatMap(refIds)],
  };
}

function warningsFor(input: HookInput): string[] {
  if (!existsSync(snapshotPath) || !existsSync(registryPath)) return [];
  return editWarnings(
    readSnapshot(),
    readRegistry(registryPath),
    editOf(input),
  );
}

function emit(warnings: string[]): void {
  if (warnings.length === 0) return;
  const additionalContext = `Paper drift warning (from the last snapshot):\n- ${warnings.join('\n- ')}`;
  const hookSpecificOutput = {
    hookEventName: 'PostToolUse',
    additionalContext,
  };
  process.stdout.write(JSON.stringify({ hookSpecificOutput }));
}

try {
  const parsed = hookInput.safeParse(JSON.parse(readFileSync(0, 'utf8')));
  if (parsed.success) emit(warningsFor(parsed.data));
} catch (error) {
  process.stderr.write(`paper-drift-hook: skipped (${String(error)})\n`);
}
