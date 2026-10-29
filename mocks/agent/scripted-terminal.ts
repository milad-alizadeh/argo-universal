import type {
  KillTerminalRequest,
  SessionUpdate,
  TerminalOutputResponse,
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
  await completeTerminal(step, scope, turn);
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
  step: TerminalStep,
  scope: KillTerminalRequest,
  turn: ScriptedTurn,
): Promise<void> => {
  if (step.completion === 'leave-running') return;

  if (step.completion === 'kill')
    await turn.client.request('terminal/kill', scope);

  await turn.client.request('terminal/wait_for_exit', scope);
  const output = await recordOutput(step, scope, turn);
  await turn.client.request('terminal/release', scope);
  requireExitCode(step, output);
};

const recordOutput = async (
  step: TerminalStep,
  scope: KillTerminalRequest,
  turn: ScriptedTurn,
): Promise<TerminalOutputResponse> => {
  const output = await turn.client.request('terminal/output', scope);
  step.outputs?.push(output);

  return output;
};

const requireExitCode = (
  step: TerminalStep,
  output: TerminalOutputResponse,
): void => {
  if (step.requiredExitCode === undefined) return;

  if (receivedExitCode(output) === step.requiredExitCode) return;

  throw new Error(
    `Terminal ${step.toolCallId} expected exit ${step.requiredExitCode}, got ${JSON.stringify(output.exitStatus)}: ${output.output}`,
  );
};

const receivedExitCode = (
  output: TerminalOutputResponse,
): number | null | undefined => output.exitStatus?.exitCode;
