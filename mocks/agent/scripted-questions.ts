import type { ScriptedStep, ScriptedTurn } from './scripted-types.ts';

type QuestionStep = Extract<
  ScriptedStep,
  { type: 'permission' | 'elicitation' | 'request-elicitation' }
>;
export const runQuestion = (
  step: QuestionStep,
  turn: ScriptedTurn,
): Promise<void> => {
  if (step.type === 'permission') return askPermission(step, turn);
  if (step.type === 'elicitation') return askElicitation(step, turn);
  return askRequestElicitation(step, turn);
};
const requestOptions = (
  step: QuestionStep,
): { cancellationSignal: AbortSignal } | undefined =>
  step.signal ? { cancellationSignal: step.signal } : undefined;
const askPermission = (
  step: Extract<QuestionStep, { type: 'permission' }>,
  turn: ScriptedTurn,
): Promise<void> =>
  observeQuestion(
    turn.client.request(
      'session/request_permission',
      {
        ...step.request,
        sessionId: turn.sessionId,
      },
      requestOptions(step),
    ),
    step,
  );
const askElicitation = (
  step: Extract<QuestionStep, { type: 'elicitation' }>,
  turn: ScriptedTurn,
): Promise<void> =>
  observeQuestion(
    turn.client.request(
      'elicitation/create',
      {
        ...step.request,
        sessionId: turn.sessionId,
      },
      requestOptions(step),
    ),
    step,
  );
type RequestElicitationStep = Extract<
  QuestionStep,
  { type: 'request-elicitation' }
>;
const askRequestElicitation = (
  step: RequestElicitationStep,
  turn: ScriptedTurn,
): Promise<void> => {
  if (turn.requestId == null) throw new Error('Missing scripted request scope');
  const request = { ...step.request, requestId: turn.requestId };
  return observeQuestion(
    turn.client.request('elicitation/create', request, requestOptions(step)),
    step,
  );
};

const observeQuestion = async <Response>(
  pending: Promise<Response>,
  step: { responses?: Response[]; detached?: boolean },
): Promise<void> => {
  const observed = pending.then((response) => {
    step.responses?.push(response);
  });
  if (step.detached) {
    void observed.catch(() => {});
    return;
  }
  await observed;
};
