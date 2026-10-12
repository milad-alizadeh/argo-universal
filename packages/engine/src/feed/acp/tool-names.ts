import type { FeedUpdate } from '@repo/contracts';
import { z } from 'zod';

type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;

// claude-agent-acp names an MCP Tool call `mcp__<server>__<tool>`.
const claudeMcpName = /^mcp__(.+?)__(.+)$/;
// codex-acp titles one `mcp.<server>.<tool>` and sends both in its input.
const CodexMcpInput = z.object({ server: z.string(), tool: z.string() });
const SearchInput = z.object({
  pattern: z.string().min(1),
  path: z.string().min(1).optional(),
});
const CommandInput = z.object({ description: z.string().trim().min(1) });

function mcpName(row: ToolRow): { server: string; tool: string } | undefined {
  const claude = row.name?.match(claudeMcpName);
  if (claude?.[1] && claude[2] && row.title === row.name)
    return { server: claude[1], tool: claude[2] };
  const codex = CodexMcpInput.safeParse(row.rawInput);
  if (
    codex.success &&
    row.title === `mcp.${codex.data.server}.${codex.data.tool}`
  )
    return codex.data;
  return undefined;
}

function searchTitle(row: ToolRow): string | undefined {
  if (row.kind !== 'search') return undefined;
  const input = SearchInput.safeParse(row.rawInput);
  if (!input.success) return undefined;
  const where = input.data.path ? ` in ${input.data.path}` : '';
  if (row.name === 'Grep') return `Search for ${input.data.pattern}${where}`;
  if (row.name === 'Glob')
    return `Find files matching ${input.data.pattern}${where}`;
  return undefined;
}

function commandDescription(row: ToolRow): string | undefined {
  if (row.kind !== 'execute') return undefined;
  const input = CommandInput.safeParse(row.rawInput);
  return input.success ? input.data.description : undefined;
}

// Readable names for the Tool calls an ACP adapter titles by tool id or as a command line, from the name and input it sent.
export function nameToolCall(row: ToolRow): ToolRow {
  const mcp = mcpName(row);
  if (mcp)
    return { ...row, title: `${mcp.server}: ${mcp.tool}`, name: mcp.tool };
  const title = searchTitle(row);
  if (title) return { ...row, title };
  const description = commandDescription(row);
  if (description && row._meta?.argo?.description !== description)
    return {
      ...row,
      _meta: {
        ...row._meta,
        argo: { ...row._meta?.argo, description },
      },
    };
  return row;
}
