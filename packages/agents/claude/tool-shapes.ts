import {
  DiffChange,
  ToolCallLocation,
  ToolCallTerminal,
  ToolCallUpdate,
  WebAction,
} from '@repo/contracts';
import { dictionary } from './dictionary';
import type { ToolShape, ToolUseBlock } from './tool-rows';
// How each built-in tool reads.
const toolShapes: Record<string, (input: unknown) => ToolShape> = {
  Write: (input): ToolShape => {
    const fields = dictionary(input);
    const location = ToolCallLocation.parse({ path: fields.file_path });
    const change = DiffChange.parse({
      operation: 'add',
      path: location.path,
      newText: fields.content,
    });
    return editShape('Write', change, [location]);
  },
  Edit: (input): ToolShape => {
    const fields = dictionary(input);
    const change = DiffChange.parse({
      operation: 'modify',
      path: fields.file_path,
      oldText: fields.old_string,
      newText: fields.new_string,
    });
    return editShape('Edit', change, [{ path: change.path }]);
  },
  Read: (input): ToolShape => {
    const fields = dictionary(input);
    const location = ToolCallLocation.parse({
      path: fields.file_path,
      line: fields.offset,
    });
    const { path } = location;
    return {
      title: `Read ${path}`,
      kind: 'read',
      locations: [location],
      content: [],
    };
  },
  Bash: (input): ToolShape => {
    const fields = dictionary(input);
    const terminal = ToolCallTerminal.parse({
      type: 'terminal',
      command: fields.command,
      output: '',
    });
    return terminalShape(fields.description, terminal);
  },
  Grep: (input): ToolShape => search('Search for', input),
  Glob: (input): ToolShape => search('Find files matching', input),
  WebFetch: (input): ToolShape => ({
    title: `Fetch ${ToolCallUpdate.shape.title.parse(dictionary(input).url)}`,
    kind: 'fetch',
    content: [],
  }),
  WebSearch: (input): ToolShape => ({
    title: `Search the web for ${ToolCallUpdate.shape.title.parse(dictionary(input).query)}`,
    kind: 'fetch',
    content: [],
  }),
  ExitPlanMode: (): ToolShape => ({
    title: 'Leave plan mode',
    kind: 'switch_mode',
    content: [],
  }),
};

function search(verb: string, input: unknown): ToolShape {
  const fields = dictionary(input);
  const pattern = ToolCallUpdate.shape.title.parse(fields.pattern);
  const path = ToolCallLocation.shape.path.optional().parse(fields.path);
  return {
    title: `${verb} ${pattern}${path ? ` in ${path}` : ''}`,
    kind: 'search',
    content: [],
  };
}

export function ownToolShape(block: ToolUseBlock): ToolShape | undefined {
  if (!Object.hasOwn(toolShapes, block.name)) return undefined;
  return toolShapes[block.name]?.(block.input);
}

const mcpToolName = /^mcp__(.+?)__(.+)$/;
const subagentTools = new Set(['Agent', 'Task']);
// Any other tool shows as `other`, named by its MCP server and tool or by the Subagent's description.
export function otherToolShape(block: ToolUseBlock): ToolShape {
  return { title: otherToolTitle(block), kind: 'other', content: [] };
}
function otherToolTitle(block: ToolUseBlock): string {
  const mcp = mcpToolName.exec(block.name);
  if (mcp) return `${mcp[1]}: ${mcp[2]}`;
  if (!subagentTools.has(block.name)) return block.name;
  const description = dictionary(block.input).description;
  return typeof description === 'string' && description.trim()
    ? description
    : block.name;
}

// The web action a WebSearch or WebFetch input names.
export function webActionOf(block: ToolUseBlock): WebAction | undefined {
  const fields = dictionary(block.input);
  if (block.name === 'WebSearch')
    return WebAction.parse({ type: 'search', query: fields.query });
  if (block.name === 'WebFetch')
    return WebAction.parse({ type: 'fetch', url: fields.url });
  return undefined;
}

function editShape(
  name: string,
  change: DiffChange,
  locations: ToolShape['locations'],
): ToolShape {
  return {
    title: `${name} ${change.path}`,
    kind: 'edit',
    locations,
    content: [{ type: 'diff', changes: [change] }],
  };
}
function terminalShape(
  description: unknown,
  terminal: ToolCallTerminal,
): ToolShape {
  return {
    title: ToolCallUpdate.shape.title.parse(description ?? terminal.command),
    kind: 'execute',
    content: [terminal],
  };
}
