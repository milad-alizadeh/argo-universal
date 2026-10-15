import { RequestError } from '@agentclientprotocol/sdk';
import { runQuestion } from './scripted-questions.ts';
import type { ScriptedStep, ScriptedTurn } from './scripted-types.ts';

export const runStep = async (
  step: ScriptedStep,
  turn: ScriptedTurn,
): Promise<void> => {
  if (step.type === 'permission') return runQuestion(step, turn);

  return runRemainingStep(step, turn);
};

const runRemainingStep = (
  step: Exclude<ScriptedStep, { type: 'permission' }>,
  turn: ScriptedTurn,
): Promise<void> => {
  switch (step.type) {
    case 'elicitation':
    case 'request-elicitation':
      return runQuestion(step, turn);
    default:
      return runControlStep(step, turn);
  }
};

type ControlStep = Exclude<
  ScriptedStep,
  { type: 'permission' | 'elicitation' | 'request-elicitation' }
>;

const runControlStep = (
  step: ControlStep,
  turn: ScriptedTurn,
): Promise<void> => {
  if (step.type === 'update')
    return turn.client.notify('session/update', {
      sessionId: step.sessionId ?? turn.sessionId,
      update: step.update,
    });

  return runTimingStep(step, turn);
};

type TimingStep = Exclude<ControlStep, { type: 'update' }>;

const runTimingStep = async (
  step: TimingStep,
  turn: ScriptedTurn,
): Promise<void> => {
  switch (step.type) {
    case 'wait-for-cancel':
      return waitForCancel(step, turn);
    case 'gate':
      return runGate(step);
    default:
      return runStreamStep(step, turn);
  }
};

type StreamStep = Exclude<TimingStep, { type: 'wait-for-cancel' | 'gate' }>;

const runStreamStep = async (
  step: StreamStep,
  turn: ScriptedTurn,
): Promise<void> => {
  switch (step.type) {
    case 'parallel':
      await Promise.all(step.steps.map((parallel) => runStep(parallel, turn)));

      return;
    case 'yield':
      return new Promise((resolve) => setTimeout(resolve, 0));
    default:
      return runWireStep(step, turn);
  }
};

const runWireStep = (
  step: Exclude<StreamStep, { type: 'parallel' | 'yield' }>,
  turn: ScriptedTurn,
): Promise<void> => {
  if (step.type === 'fail')
    throw RequestError.internalError(undefined, step.message);

  if (step.type === 'raw')
    return turn.writeRaw(step.frame.replaceAll('$sessionId', turn.sessionId));

  return runExitStep(step, turn);
};

const runGate = (
  step: Extract<ScriptedStep, { type: 'gate' }>,
): Promise<void> => {
  step.entered?.resolve();

  return step.waitFor;
};

const waitForCancel = (
  step: Extract<ScriptedStep, { type: 'wait-for-cancel' }>,
  turn: ScriptedTurn,
): Promise<void> =>
  step.until ? Promise.race([turn.cancelled, step.until]) : turn.cancelled;

const runExitStep = (
  step: Extract<ScriptedStep, { type: 'exit' | 'hold' }>,
  turn: ScriptedTurn,
): Promise<void> =>
  step.type === 'exit' ? turn.exit(step.code, step.stderr) : turn.closed;
