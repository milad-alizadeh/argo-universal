import type { RuntimeTrial, RuntimeWorkload } from './runtime-types.mts';

export function initialTrial(
  sessionId: string,
  work: RuntimeWorkload,
): RuntimeTrial {
  return {
    id: work.id,
    sessionId,
    status: 'failed',
    ...emptyObservations(),
    ...initialValidation(work),
    stdout: initialStdout(work),
  };
}

function initialStdout(workload: RuntimeWorkload): RuntimeTrial['stdout'] {
  return {
    observed: '',
    final: '',
    expected: workload.expectedStdout ?? null,
    matches: null,
  };
}

type InitialValidation = Pick<
  RuntimeTrial,
  | 'reply'
  | 'replyMatches'
  | 'activeToolAtCancel'
  | 'expectedReply'
  | 'timeoutMs'
>;

function initialValidation(work: RuntimeWorkload): InitialValidation {
  return {
    reply: '',
    replyMatches: null,
    activeToolAtCancel: null,
    expectedReply: work.expectedReply ?? null,
    timeoutMs: work.timeoutMs,
  };
}

type InitialObservations = Pick<
  RuntimeTrial,
  'measurements' | 'milestones' | 'choices' | 'wire'
>;

function emptyObservations(): InitialObservations {
  return { measurements: {}, milestones: [], choices: {}, wire: [] };
}
