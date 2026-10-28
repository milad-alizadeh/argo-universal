import type {
  CreateTerminalRequest,
  SessionNotification,
  ToolCallContent,
  TerminalExitStatus,
} from '@agentclientprotocol/sdk';
import type { Shell, ShellRecord } from '@repo/contracts';

type TerminalReference = Extract<ToolCallContent, { type: 'terminal' }>;

type ShellOrigin = Pick<
  ShellRecord,
  'sessionId' | 'toolCallId' | 'cwd' | 'startedAt'
>;

// Display only: ACP supplies an executable and argv, never a shell command line.
const quoteArgument = (argument: string): string =>
  `'${argument.replaceAll("'", "'\\''")}'`;

const terminalCommand = (request: CreateTerminalRequest): string =>
  [request.command, ...(request.args ?? [])].map(quoteArgument).join(' ');

export const shellFromTerminal = (
  request: CreateTerminalRequest,
  terminal: TerminalReference,
  origin: ShellOrigin,
): ShellRecord => ({
  ...origin,
  id: terminal.terminalId,
  command: terminalCommand(request),
  cwd: request.cwd ?? origin.cwd,
  status: 'running',
  exitCode: null,
  endedAt: null,
  outputBlobId: null,
});

// A Tool call settling or a Turn ending is not a terminal exit.
export const shellWithExit = (
  shell: ShellRecord,
  exit: { status: TerminalExitStatus; endedAt: number; stopped: boolean },
): ShellRecord => ({
  ...shell,
  status: exit.stopped ? 'stopped' : 'exited',
  exitCode: exit.status.exitCode ?? null,
  endedAt: exit.endedAt,
});

export const toShell = (
  { outputBlobId: _outputBlobId, ...shell }: ShellRecord,
  observation: { now: number; terminalAvailable: boolean },
): Shell => ({
  ...shell,
  durationMs: (shell.endedAt ?? observation.now) - shell.startedAt,
  canStop: shell.status === 'running' && observation.terminalAvailable,
});

export const terminalReferences = (
  update: SessionNotification['update'],
): { toolCallId: string; terminalId: string }[] => {
  if (!('toolCallId' in update)) return [];

  return terminalIds(update.content ?? []).map((terminalId) => ({
    toolCallId: update.toolCallId,
    terminalId,
  }));
};

const terminalIds = (content: ToolCallContent[]): string[] =>
  content.flatMap((entry) =>
    entry.type === 'terminal' ? [entry.terminalId] : [],
  );
