import { expect, it } from 'vitest';
import { ToolCallUpdate } from './session-update';
import {
  type CommandAction,
  isToolCallRunning,
  knownCommandActions,
  ToolCallStatus,
} from './tool-call';

const running: Record<ToolCallStatus, boolean> = {
  pending: true,
  in_progress: true,
  completed: false,
  failed: false,
  cancelled: false,
};
it.each(
  ToolCallStatus.options.map(
    (
      status,
    ): {
      status: 'cancelled' | 'completed' | 'failed' | 'in_progress' | 'pending';
      running: boolean;
    } => ({
      status,
      running: running[status],
    }),
  ),
)(
  'reports $status Tool calls as running=$running',
  ({ status, running }): void => {
    const row = ToolCallUpdate.parse({
      id: 'tool-1',
      sessionId: 'session-1',
      turnId: 'turn-1',
      position: 1,
      revision: 1,
      state: 'settled',
      sessionUpdate: 'tool_call_update',
      toolCallId: 'tool-1',
      kind: 'execute',
      title: 'Run command',
      status,
      content: [],
    });
    expect(isToolCallRunning(row)).toBe(running);
  },
);

const actionCases: {
  name: string;
  actions?: CommandAction[];
  expected: CommandAction[];
}[] = [
  { name: 'absent actions', expected: [] },
  { name: 'empty actions', actions: [], expected: [] },
  {
    name: 'read',
    actions: [{ type: 'read', command: 'cat file', path: 'file' }],
    expected: [{ type: 'read', command: 'cat file', path: 'file' }],
  },
  {
    name: 'search',
    actions: [{ type: 'search', command: 'rg text', query: 'text' }],
    expected: [{ type: 'search', command: 'rg text', query: 'text' }],
  },
  {
    name: 'list',
    actions: [{ type: 'list', command: 'ls', path: '.' }],
    expected: [{ type: 'list', command: 'ls', path: '.' }],
  },
  {
    name: 'multiple known',
    actions: [
      { type: 'read', command: 'cat file' },
      { type: 'search', command: 'rg text' },
      { type: 'list', command: 'ls' },
    ],
    expected: [
      { type: 'read', command: 'cat file' },
      { type: 'search', command: 'rg text' },
      { type: 'list', command: 'ls' },
    ],
  },
  {
    name: 'unknown',
    actions: [{ type: 'unknown', command: 'custom' }],
    expected: [],
  },
  {
    name: 'known followed by unknown',
    actions: [
      { type: 'read', command: 'cat file' },
      { type: 'unknown', command: 'custom' },
    ],
    expected: [],
  },
  {
    name: 'unknown followed by known',
    actions: [
      { type: 'unknown', command: 'custom' },
      { type: 'read', command: 'cat file' },
    ],
    expected: [],
  },
];
it.each(actionCases)(
  'returns known command actions for $name',
  ({ actions, expected }): void => {
    const row = ToolCallUpdate.parse({
      id: 'tool-1',
      sessionId: 'session-1',
      turnId: 'turn-1',
      position: 1,
      revision: 1,
      state: 'settled',
      sessionUpdate: 'tool_call_update',
      toolCallId: 'tool-1',
      kind: 'execute',
      title: 'Run command',
      status: 'completed',
      content: [],
      _meta: { argo: { commandActions: actions } },
    });
    expect(knownCommandActions(row)).toEqual(expected);
    expect(row._meta?.argo?.commandActions).toEqual(actions);
  },
);

it('returns no command actions when the Tool call has no extension metadata', (): void => {
  const row = ToolCallUpdate.parse({
    id: 'tool-1',
    sessionId: 'session-1',
    turnId: 'turn-1',
    position: 1,
    revision: 1,
    state: 'settled',
    sessionUpdate: 'tool_call_update',
    toolCallId: 'tool-1',
    kind: 'execute',
    title: 'Run command',
    status: 'completed',
    content: [],
  });
  expect(knownCommandActions(row)).toEqual([]);
});
