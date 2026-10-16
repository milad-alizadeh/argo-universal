import {
  knownCommandActions,
  type ToolCallUpdate,
  type ToolCallTerminal,
} from '@repo/contracts';

export function toolKindLabel(tool: ToolCallUpdate): string | null {
  const path = toolPath(tool);
  const verb = pathVerbs[tool.kind];

  if (verb) return path ? `${verb} ${path}` : `${verb} files`;

  return otherLabel(tool);
}

function otherLabel(tool: ToolCallUpdate): string | null {
  if (tool.kind === 'execute') return commandLabel(tool);

  return fixedLabels[tool.kind] ?? null;
}

const fixedLabels: Partial<Record<ToolCallUpdate['kind'], string>> = {
  think: 'Thinking',
  switch_mode: 'Switching mode',
};

const pathVerbs: Partial<Record<ToolCallUpdate['kind'], string>> = {
  read: 'Reading',
  edit: 'Editing',
  delete: 'Deleting',
  move: 'Moving',
};

function toolPath(tool: ToolCallUpdate): string | undefined {
  const first = tool.locations?.[0];

  return first ? first.path : diffPath(tool);
}

function diffPath(tool: ToolCallUpdate): string | undefined {
  return tool.content.flatMap((block): string[] =>
    block.type === 'diff'
      ? block.changes.map((change): string => change.path)
      : [],
  )[0];
}

function commandLabel(tool: ToolCallUpdate): string {
  const action = knownCommandActions(tool)[0];

  if (action) return actionLabel(action, tool);

  return terminalLabel(tool);
}

function actionLabel(
  action: ReturnType<typeof knownCommandActions>[number],
  tool: ToolCallUpdate,
): string {
  if (action.type === 'search') return searchAction(action.query);

  return action.type === 'read'
    ? fileAction('Reading', action.path)
    : listAction(action, tool);
}

function terminalLabel(tool: ToolCallUpdate): string {
  const terminal = tool.content.find(
    (block): block is ToolCallTerminal => block.type === 'terminal',
  );

  return terminal?.command ? `Running ${terminal.command}` : 'Running command';
}

function fileAction(verb: string, path: string | undefined): string {
  return path ? `${verb} ${path}` : `${verb} files`;
}

function searchAction(query: string | undefined): string {
  return query ? `Searching for ${query}` : 'Searching files';
}

function listAction(
  action: ReturnType<typeof knownCommandActions>[number],
  tool: ToolCallUpdate,
): string {
  return action.type === 'list'
    ? fileAction('Listing', action.path)
    : terminalLabel(tool);
}
