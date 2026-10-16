import type {
  KillTerminalRequest,
  SessionUpdate,
} from '@agentclientprotocol/sdk';
import type { ScriptedStep, ScriptedTurn } from './scripted-types.ts';

type TerminalStep = Extract<ScriptedStep, { type: 'terminal' }>;

export const runTerminal = async (
  step: TerminalStep,
  turn: ScriptedTurn,
): Promise<void> => {
  const terminal = await turn.client.request('terminal/create', {
    ...step.request,
    sessionId: turn.sessionId,
  });

  const scope = { sessionId: turn.sessionId, terminalId: terminal.terminalId };
  await turn.client.notify('session/update', {
    sessionId: turn.sessionId,
    update: terminalUpdate(step, terminal.terminalId),
  });
  await completeTerminal(step.completion, scope, turn);
};

const terminalUpdate = (
  step: TerminalStep,
  terminalId: string,
): SessionUpdate => ({
  sessionUpdate: 'tool_call',
  toolCallId: step.toolCallId,
  title: 'Run background command',
  kind: 'execute',
  status: 'in_progress',
  content: [{ type: 'terminal', terminalId }],
});

const completeTerminal = async (
  completion: TerminalStep['completion'],
  scope: KillTerminalRequest,
  turn: ScriptedTurn,
): Promise<void> => {
  if (completion === 'leave-running') return;

  if (completion === 'kill') await turn.client.request('terminal/kill', scope);

  await turn.client.request('terminal/wait_for_exit', scope);
  await turn.client.request('terminal/output', scope);
  await turn.client.request('terminal/release', scope);
};
