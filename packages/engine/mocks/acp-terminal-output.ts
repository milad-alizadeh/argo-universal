import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';

export const terminalId = 'exec-terminal';

export const terminalCommand = 'printf QA_TERMINAL_1329';

export const terminalMarker = 'QA_TERMINAL_1329\n';

export const terminalUpdate = 'tool_call_update';

const cwd = '/project';

type Update = SessionNotification['update'];

type ToolPatch = Extract<Update, { sessionUpdate: 'tool_call_update' }>;

// Codex ACP 2.3.0 docs/air-extensions.md#zed-conventions and CommandReporter.
const start = (id: string, title: string): Update => ({
  sessionUpdate: 'tool_call',
  toolCallId: id,
  title,
  kind: 'execute',
  status: 'in_progress',
  content: [{ type: 'terminal', terminalId: id }],
  _meta: { terminal_info: { cwd, terminal_id: id } },
});

const chunk = (id: string, data: string): ToolPatch => ({
  sessionUpdate: terminalUpdate,
  toolCallId: id,
  _meta: { terminal_output_delta: { terminal_id: id, data } },
});

const end = (id: string): ToolPatch => ({
  sessionUpdate: terminalUpdate,
  toolCallId: id,
  status: 'completed',
  _meta: { terminal_exit: { terminal_id: id, exit_code: 0, signal: null } },
});

export const completedTerminal: Update[] = [
  start(terminalId, terminalCommand),
  {
    ...end(terminalId),
    _meta: {
      ...chunk(terminalId, terminalMarker)._meta,
      ...end(terminalId)._meta,
    },
  },
];

const malformedTerminal = (): ToolPatch => ({
  sessionUpdate: terminalUpdate,
  toolCallId: 'exec-a',
  _meta: { terminal_output_delta: { terminal_id: 'exec-a', data: 7 } },
});

const initialTerminalSteps = (): ScriptedScenario['steps'] => [
  { type: 'update', update: start('exec-a', 'printf A') },
  { type: 'update', update: start('exec-b', 'printf B') },
  { type: 'update', update: chunk('exec-a', 'A') },
  { type: 'update', update: chunk('exec-b', 'B') },
  { type: 'update', update: chunk('exec-a', 'A') },
  {
    type: 'update',
    update: { ...chunk('exec-b', 'wrong terminal'), toolCallId: 'exec-a' },
  },
  { type: 'update', update: malformedTerminal() },
];

export const streamedTerminals = (
  waitFor: Promise<void>,
): ScriptedScenario => ({
  steps: [
    ...initialTerminalSteps(),
    { type: 'gate', waitFor },
    { type: 'update', update: end('exec-a') },
    { type: 'update', update: end('exec-b') },
  ],
});

const firstReport = (id: string): Update => ({
  sessionUpdate: 'tool_call',
  toolCallId: id,
  title: 'Terminal',
  kind: 'execute',
  status: 'pending',
  rawInput: {},
  content: [{ type: 'terminal', terminalId: id }],
  _meta: { terminal_info: { terminal_id: id } },
});

// claude-agent-acp 0.99.1, as captured: the first report has an empty input and a terminal_info with no cwd; the input follows in updates.
export const reportedCommand = (
  id: string,
  rawInput: ToolPatch['rawInput'],
): Update[] => [
  firstReport(id),
  { sessionUpdate: terminalUpdate, toolCallId: id, rawInput },
];

export const backgroundResult = (id: string, path: string): Update[] => [
  chunk(
    id,
    `Command running in background with ID: b1. Output is being written to: ${path}. You will be notified when it finishes.`,
  ),
  { sessionUpdate: terminalUpdate, toolCallId: id, status: 'completed' },
];

// It can come long after the Tool call completed, carrying nothing else.
export const reportedEnd = (id: string): Update => ({
  sessionUpdate: terminalUpdate,
  toolCallId: id,
  _meta: {
    terminal_exit: { terminal_id: id, exit_code: null, signal: null },
  },
});

export const commandWithoutCwd: Update[] = [
  ...reportedCommand('bash-a', { command: 'echo A' }),
  chunk('bash-a', 'A\n'),
  end('bash-a'),
];

export const readCommand: Update[] = [
  {
    sessionUpdate: 'tool_call',
    toolCallId: 'read-a',
    title: 'Read file',
    kind: 'read',
    status: 'in_progress',
  },
  chunk('read-a', 'source\n'),
  {
    sessionUpdate: terminalUpdate,
    toolCallId: 'read-a',
    status: 'completed',
    rawOutput: { exit_code: 0 },
  },
];

export const largeStream = (head: string): Update[] => [
  start('large', 'Large output'),
  chunk('large', head),
  chunk('large', '\ntail'),
  end('large'),
];
