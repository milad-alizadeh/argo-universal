import {
  type CommandAction,
  isToolCallRunning,
  knownCommandActions,
  selectActivePlan,
  type SessionSnapshot,
  type SessionUpdate,
  type ToolCallUpdate,
} from '@repo/contracts';
import type {
  FeedActivity,
  FeedExploration,
  FeedGroup,
  FeedView,
} from './feed-view';

function explorationActions(row: ToolCallUpdate): CommandAction[] {
  const actions = knownCommandActions(row);
  if (actions.length) return actions;
  if (row.kind === 'read' || row.kind === 'search')
    return [{ type: row.kind, command: '', path: row.locations?.[0]?.path }];
  return [];
}

function explorationLines(toolCalls: ToolCallUpdate[]): string[] {
  const lines: string[] = [];
  let previousWasRead = false;
  for (const row of toolCalls) {
    for (const action of explorationActions(row)) {
      if (action.type === 'read' && action.path) {
        const lastIndex = lines.length - 1;
        if (previousWasRead) lines[lastIndex] += `, ${action.path}`;
        else lines.push(`Read ${action.path}`);
        previousWasRead = true;
      } else {
        if (action.type === 'search' && action.query)
          lines.push(
            `Searched for ${action.query}${action.path ? ` in ${action.path}` : ''}`,
          );
        else if (action.type === 'list' && action.path)
          lines.push(`Listed files in ${action.path}`);
        else lines.push(row.title);
        previousWasRead = false;
      }
    }
  }
  return lines;
}

function editsSeveralFiles(row: ToolCallUpdate): boolean {
  if (!['edit', 'delete', 'move'].includes(row.kind)) return false;
  const paths = new Set(row.locations?.map((location) => location.path));
  for (const content of row.content)
    if (content.type === 'diff')
      for (const change of content.changes) paths.add(change.path);
  return paths.size > 1;
}

function groupTitle(toolCalls: ToolCallUpdate[]): string {
  const parts: string[] = [];
  const add = (verb: string, count: number, noun: string): void => {
    if (count) parts.push(`${verb} ${count} ${noun}${count === 1 ? '' : 's'}`);
  };
  add(
    'Ran',
    toolCalls.filter(
      (row) => row.kind === 'execute' && !explorationActions(row).length,
    ).length,
    'command',
  );
  const actions = toolCalls.flatMap(explorationActions);
  const reads = actions.filter((action) => action.type === 'read');
  const readFiles = new Set(
    reads.flatMap((action) => (action.path ? [action.path] : [])),
  );
  add(
    'Read',
    readFiles.size + reads.filter((action) => !action.path).length,
    'file',
  );
  const edits = toolCalls.filter((row) =>
    ['edit', 'delete', 'move'].includes(row.kind),
  );
  const editedFiles = new Set<string>();
  let editsWithoutPaths = 0;
  for (const row of edits) {
    const paths = new Set(row.locations?.map((location) => location.path));
    for (const content of row.content)
      if (content.type === 'diff')
        for (const change of content.changes) paths.add(change.path);
    if (!paths.size) editsWithoutPaths += 1;
    for (const path of paths) editedFiles.add(path);
  }
  add('Edited', editedFiles.size + editsWithoutPaths, 'file');
  add(
    'Searched',
    actions.filter((action) => action.type === 'search').length,
    'time',
  );
  add(
    'Listed',
    actions.filter((action) => action.type === 'list').length,
    'folder',
  );
  add(
    'Searched the web',
    toolCalls.filter((row) => row.kind === 'fetch').length,
    'time',
  );
  add('Called', toolCalls.filter((row) => row.kind === 'other').length, 'tool');
  return parts.join(', ') || 'Worked';
}

// Rows arrive in Feed position order; neither rows nor the snapshot are changed.
export function toFeedView(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): FeedView {
  const view: FeedView = { items: [], plan: selectActivePlan(rows) };
  let activities: FeedActivity[] = [];
  let toolCalls: ToolCallUpdate[] = [];
  let exploration: FeedExploration | undefined;
  let previousTurnId: string | null | undefined;
  let liveTitle: string | undefined;
  let live: Extract<FeedGroup, { state: 'open' }>['live'];

  function flushGroup(): void {
    const first = activities[0];
    if (!first) return;
    for (const activity of activities)
      if (activity.type === 'exploration') {
        activity.lines = explorationLines(activity.toolCalls);
        activity.title = activity.toolCalls.some(isToolCallRunning)
          ? 'Exploring'
          : 'Explored';
      }
    if (
      !toolCalls.length ||
      (activities.length === 1 &&
        !liveTitle &&
        !toolCalls.some(
          (row) => row.status !== 'failed' && editsSeveralFiles(row),
        ))
    ) {
      view.items.push(...activities);
    } else {
      view.items.push({
        type: 'group',
        id: first.type === 'exploration' ? first.id : first.row.id,
        title: liveTitle ?? groupTitle(toolCalls),
        ...(liveTitle
          ? { state: 'open' as const, ...(live ? { live } : {}) }
          : { state: 'settled' as const }),
        items: activities,
      });
    }
    activities = [];
    toolCalls = [];
    exploration = undefined;
    liveTitle = undefined;
    live = undefined;
  }

  for (const row of rows) {
    if (previousTurnId !== undefined && row.turnId !== previousTurnId)
      flushGroup();
    previousTurnId = row.turnId;
    if (row.sessionUpdate === 'plan_update') continue;
    if (row.sessionUpdate === 'agent_thought') {
      activities.push({ type: 'thought', row });
      if (row.state === 'open') liveTitle = 'Thinking';
    } else if (row.sessionUpdate === 'notice' && row.severity !== 'error') {
      activities.push({ type: 'row', row });
    } else if (row.sessionUpdate === 'tool_call_update') {
      const awaitingPermission =
        row.toolCallId === snapshot.pendingPermission?.toolCallId;
      toolCalls.push(row);
      const actions = explorationActions(row);
      if (
        isToolCallRunning(row) &&
        (awaitingPermission || !live?.awaitingApproval)
      ) {
        live = { toolCall: row, awaitingApproval: awaitingPermission };
        if (awaitingPermission) {
          liveTitle = 'Awaiting approval';
        } else if (actions.length && !row._meta?.argo?.permissionOutcome) {
          liveTitle = 'Exploring';
        } else {
          liveTitle = row.title || row.name || 'Working';
        }
      }
      if (
        actions.length &&
        row.status !== 'failed' &&
        row.status !== 'cancelled' &&
        !awaitingPermission &&
        !row._meta?.argo?.permissionOutcome
      ) {
        if (!exploration) {
          exploration = {
            type: 'exploration',
            id: row.id,
            title: 'Explored',
            lines: [],
            toolCalls: [],
          };
          activities.push(exploration);
        }
        exploration.toolCalls.push(row);
      } else {
        activities.push({
          type: 'tool_call',
          row,
          ...(awaitingPermission ? { awaitingApproval: true } : {}),
        });
        if (!actions.length) exploration = undefined;
      }
    } else {
      flushGroup();
      view.items.push({ type: 'row', row });
    }
  }
  flushGroup();
  return view;
}
