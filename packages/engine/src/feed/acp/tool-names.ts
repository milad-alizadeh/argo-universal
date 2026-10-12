import type { FeedUpdate } from '@repo/contracts';
import { z } from 'zod';

type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;
type McpName = { server: string; tool: string };

// claude-agent-acp names an MCP Tool call `mcp__<server>__<tool>` and titles it the same.
const ClaudeMcpName = z.tuple(
  [z.literal('mcp'), z.string().min(1)],
  z.string().min(1),
);
// codex-acp titles one `mcp.<server>.<tool>` and sends both in its input.
const CodexMcpInput = z.object({ server: z.string(), tool: z.string() });
const searchVerbs = { Grep: 'Search for', Glob: 'Find files matching' };
const SearchCall = z.object({
  kind: z.literal('search'),
  name: z.enum(['Grep', 'Glob']),
  rawInput: z.object({
    pattern: z.string().min(1),
    path: z.string().min(1).optional(),
  }),
});
const CommandCall = z.object({
  kind: z.literal('execute'),
  rawInput: z.object({ description: z.string().trim().min(1) }),
});

function claudeMcpName(row: ToolRow): McpName | undefined {
  const parts = ClaudeMcpName.safeParse(row.title.split('__'));
  if (!parts.success || row.name !== row.title) return undefined;
  const [, server, ...tool] = parts.data;
  return { server, tool: tool.join('__') };
}

function codexMcpName(row: ToolRow): McpName | undefined {
  const input = CodexMcpInput.safeParse(row.rawInput);
  return input.success &&
    row.title === `mcp.${input.data.server}.${input.data.tool}`
    ? input.data
    : undefined;
}

function withMcpName(row: ToolRow): ToolRow {
  const mcp = claudeMcpName(row) ?? codexMcpName(row);
  return mcp
    ? { ...row, title: `${mcp.server}: ${mcp.tool}`, name: mcp.tool }
    : row;
}

const inPath = (path: string | undefined): string =>
  path ? ` in ${path}` : '';

function withSearchTitle(row: ToolRow): ToolRow {
  const search = SearchCall.safeParse(row);
  if (!search.success) return row;
  const { name, rawInput } = search.data;
  return {
    ...row,
    title: `${searchVerbs[name]} ${rawInput.pattern}${inPath(rawInput.path)}`,
  };
}

const argoMetadata = (row: ToolRow): NonNullable<ToolRow['_meta']>['argo'] =>
  row._meta?.argo ?? {};

function withDescription(row: ToolRow): ToolRow {
  const command = CommandCall.safeParse(row);
  if (!command.success) return row;
  const { description } = command.data.rawInput;
  return {
    ...row,
    _meta: { ...row._meta, argo: { ...argoMetadata(row), description } },
  };
}

// Readable names for the Tool calls an ACP adapter titles by tool id or as a command line, from the name and input it sent.
export const nameToolCall = (row: ToolRow): ToolRow =>
  withDescription(withSearchTitle(withMcpName(row)));
