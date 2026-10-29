import { SessionNewOutput } from '@repo/contracts';
import {
  OperationExecution,
  type OperationId,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { askOperation } from '#mocks/operation-permissions';
import { addOtherProject } from '#mocks/session-access';
import {
  delegationJourney,
  holdSession,
  startDelegated,
  type DelegationJourney,
} from '#mocks/session-delegation';

const Refusal = z.object({
  message: z.string(),
  data: z.object({ code: z.string() }),
});

type Target = 'self' | 'started' | 'unrelated' | 'foreign';

type Targets = Record<Target, string>;

// Without a held Turn, a call its scope would ask about is refused before it runs.
const asked = 'A Permission request requires an active Turn';

// The implementation's own refusal still means the call ran past its scope.
type ImplementationError = { code: string; message: string };

type ActOperation = {
  id: OperationId;
  params: (sessionId: string) => Json;
  ranWith?: ImplementationError;
};

// The caller's own Session comes last in each row, and session.close comes last, so closing it ends the table.
const actOperations: ActOperation[] = [
  {
    id: 'session.rename',
    params: (sessionId) => ({ sessionId, title: 'Renamed' }),
  },
  {
    id: 'session.setConfigOption',
    params: (sessionId) => ({
      sessionId,
      configId: 'mode',
      type: 'id',
      value: 'x',
    }),
    ranWith: { code: 'BAD_REQUEST', message: 'The Agent did not offer mode=x' },
  },
  {
    id: 'session.savePlan',
    params: (sessionId) => ({ sessionId, plan: '# Plan' }),
  },
  {
    id: 'shell.stop',
    params: (sessionId) => ({ sessionId, shellId: 'no-shell' }),
    ranWith: { code: 'NOT_FOUND', message: 'No Shell in this Session' },
  },
  {
    id: 'session.cancel',
    params: (sessionId) => ({ sessionId }),
    ranWith: {
      code: 'CONFLICT',
      message:
        'Session cannot accept session.cancel in {"open":{"acp":"idle"}}',
    },
  },
  { id: 'session.close', params: (sessionId) => ({ sessionId }) },
];

const ownedRow = {
  self: 'ran',
  started: 'ran',
  unrelated: 'asked',
  foreign: 'asked',
};

// The caller's own scope is itself and the Sessions it started in its Project: those run, any other asks.
it('keeps act Operations from a Session token within the caller’s own scope', async () => {
  const journey = await delegationJourney();
  const targets = await scopeTargets(journey);
  const outcomes: Record<string, Record<string, string>> = {};

  for (const operation of actOperations)
    outcomes[operation.id] = await scopeRow(journey, targets, operation);

  expect(outcomes).toEqual(
    Object.fromEntries(actOperations.map(({ id }) => [id, ownedRow])),
  );
}, 60_000);

async function scopeTargets(journey: DelegationJourney): Promise<Targets> {
  const started = await startDelegated(journey);

  const unrelated = await journey.host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Unrelated' }],
  });

  await waitForAcpSessionIdle(journey.host, unrelated.sessionId);

  return {
    self: journey.caller.sessionId,
    started: started.sessionId,
    unrelated: unrelated.sessionId,
    foreign: await startForeign(journey),
  };
}

// The caller starts this Session itself, so only its Project is outside the caller's scope.
async function startForeign(journey: DelegationJourney): Promise<string> {
  const projectId = await addOtherProject(journey.host);
  await holdSession(journey, journey.caller.sessionId);

  const start = await askOperation(
    { host: journey.host, session: journey.caller },
    {
      id: 'session.new',
      params: {
        ...emptySessionInput,
        projectId,
        prompt: [{ type: 'text', text: 'Foreign' }],
      },
    },
  );

  await journey.host.caller.session.answerPermission({
    sessionId: journey.caller.sessionId,
    requestId: start.request.requestId,
    optionId: 'allow_once',
  });
  const [result] = await start.outcome;

  const { sessionId } = SessionNewOutput.parse(
    OperationExecution.parse(
      result?.status === 'fulfilled' ? result.value : null,
    ).result,
  );

  await waitForAcpSessionIdle(journey.host, sessionId);
  await journey.host.caller.session.cancel({
    sessionId: journey.caller.sessionId,
  });
  await waitForAcpSessionIdle(journey.host, journey.caller.sessionId);

  return sessionId;
}

async function scopeRow(
  journey: DelegationJourney,
  targets: Targets,
  operation: ActOperation,
): Promise<Record<string, string>> {
  const row: Record<string, string> = {};

  for (const target of ['foreign', 'unrelated', 'started', 'self'] as const)
    row[target] = await scopeOf(journey, operation, targets[target]);

  return row;
}

// ran, asked, or the unexpected refusal itself.
async function scopeOf(
  journey: DelegationJourney,
  { id, params, ranWith }: ActOperation,
  sessionId: string,
): Promise<string> {
  return journey.caller.caller.operations.run
    .mutate({ id, params: params(sessionId) })
    .then(
      () => 'ran',
      (cause: unknown) => refusal(cause, ranWith),
    );
}

function refusal(cause: unknown, ranWith?: ImplementationError): string {
  const { code, message } = refusalOf(cause);

  if (code === 'CONFLICT' && message === asked) return 'asked';

  if (code === ranWith?.code && message === ranWith.message) return 'ran';

  return `unexpected ${code}: ${message}`;
}

function refusalOf(cause: unknown): ImplementationError {
  const parsed = Refusal.safeParse(cause);

  return parsed.success
    ? { code: parsed.data.data.code, message: parsed.data.message }
    : { code: 'unknown', message: String(cause) };
}
