import type {
  CommandAction,
  SessionSnapshot,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import type { FeedActivity, FeedExploration, FeedView } from './feed-view';

function explorationActions(row: ToolCallUpdate): CommandAction[] {
  const actions = row._meta?.argo?.commandActions;
  if (actions?.length && actions.every((action) => action.type !== 'unknown'))
    return actions;
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

function isRunning(row: ToolCallUpdate): boolean {
  return row.status === 'pending' || row.status === 'in_progress';
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
  if (toolCalls.some((row) => ['edit', 'delete', 'move'].includes(row.kind)))
    parts.push('Edited a file');
  if (toolCalls.some((row) => explorationActions(row).length))
    parts.push('Read files');
  if (
    toolCalls.some(
      (row) => row.kind === 'execute' && !explorationActions(row).length,
    )
  )
    parts.push('ran commands');
  if (toolCalls.some((row) => row.kind === 'fetch'))
    parts.push('Searched the web');
  if (toolCalls.some((row) => row.kind === 'other')) parts.push('Called tools');
  return parts.join(', ') || 'Worked';
}

// Rows arrive in Feed position order; neither rows nor the snapshot are changed.
export function toFeedView(
  rows: readonly SessionUpdate[],
  snapshot: SessionSnapshot,
): FeedView {
  const view: FeedView = { items: [], plan: null };
  let activities: FeedActivity[] = [];
  let toolCalls: ToolCallUpdate[] = [];
  let exploration: FeedExploration | undefined;
  let previousTurnId: string | null | undefined;
  let liveTitle: string | undefined;

  function flushGroup() {
    const first = activities[0];
    if (!first) return;
    for (const activity of activities)
      if (activity.type === 'exploration') {
        activity.lines = explorationLines(activity.toolCalls);
        activity.title = activity.toolCalls.some(isRunning)
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
        state: liveTitle ? 'open' : 'settled',
        items: activities,
      });
    }
    activities = [];
    toolCalls = [];
    exploration = undefined;
    liveTitle = undefined;
  }

  for (const row of rows) {
    if (previousTurnId !== undefined && row.turnId !== previousTurnId)
      flushGroup();
    previousTurnId = row.turnId;
    if (row.sessionUpdate === 'plan_update') {
      if (row.plan.type === 'items') view.plan = row.plan;
    } else if (row.sessionUpdate === 'agent_thought') {
      activities.push({ type: 'thought', row });
      if (row.state === 'open') liveTitle = 'Thinking';
    } else if (row.sessionUpdate === 'notice' && row.severity !== 'error') {
      activities.push({ type: 'row', row });
    } else if (row.sessionUpdate === 'tool_call_update') {
      const awaitingPermission =
        row.toolCallId === snapshot.pendingPermission?.toolCallId;
      const displayedRow = awaitingPermission
        ? { ...row, title: 'Awaiting approval' }
        : row;
      toolCalls.push(displayedRow);
      const actions = explorationActions(row);
      if (isRunning(row)) {
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
        activities.push({ type: 'tool_call', row: displayedRow });
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
