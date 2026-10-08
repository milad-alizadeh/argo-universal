import {
  DiffChange,
  ToolCallLocation,
  ToolCallTerminal,
  ToolCallUpdate,
} from '@repo/contracts';
import { dictionary } from './dictionary';
import type { ToolShape, ToolUseBlock } from './tool-rows';
// How each built-in tool reads; any other tool shows as `other`.
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
  Grep: (input): ToolShape =>
    search('Grep', ToolCallUpdate.shape.title.parse(dictionary(input).pattern)),
  Glob: (input): ToolShape =>
    search('Glob', ToolCallUpdate.shape.title.parse(dictionary(input).pattern)),
  WebFetch: (input): ToolShape => ({
    title: `Fetch ${ToolCallUpdate.shape.title.parse(dictionary(input).url)}`,
    kind: 'fetch',
    content: [],
  }),
  WebSearch: (input): ToolShape => ({
    title: `Search ${ToolCallUpdate.shape.title.parse(dictionary(input).query)}`,
    kind: 'fetch',
    content: [],
  }),
  ExitPlanMode: (): ToolShape => ({
    title: 'Leave plan mode',
    kind: 'switch_mode',
    content: [],
  }),
};

const search = (name: string, pattern: string): ToolShape => ({
  title: `${name} ${pattern}`,
  kind: 'search',
  content: [],
});

export function ownToolShape(block: ToolUseBlock): ToolShape | undefined {
  if (!Object.hasOwn(toolShapes, block.name)) return undefined;
  return toolShapes[block.name]?.(block.input);
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
