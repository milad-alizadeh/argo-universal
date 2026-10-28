import { SessionNewOutput } from '@repo/contracts';
import {
  OperationExecution,
  type OperationId,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
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

type Targets = Record<'self' | 'started' | 'unrelated' | 'foreign', string>;

// Without a held Turn, a call its scope would ask about is refused before it runs.
const asked = 'A Permission request requires an active Turn';

const actOperations: [OperationId, (sessionId: string) => Json][] = [
  ['session.rename', (sessionId) => ({ sessionId, title: 'Renamed' })],
  [
    'session.setConfigOption',
    (sessionId) => ({ sessionId, configId: 'mode', type: 'id', value: 'x' }),
  ],
  ['session.savePlan', (sessionId) => ({ sessionId, plan: '# Plan' })],
  ['shell.stop', (sessionId) => ({ sessionId, shellId: 'no-shell' })],
  ['session.cancel', (sessionId) => ({ sessionId })],
  ['session.close', (sessionId) => ({ sessionId })],
];

const owned = { self: 'runs', started: 'runs', unrelated: 'asks' };

it('runs act Operations on the caller and the Sessions it started in its Project, and asks for any other', async () => {
  const journey = await delegationJourney();
  const targets = await scopeTargets(journey);
  const outcomes: Record<string, Record<string, string>> = {};

  for (const [id, params] of actOperations)
    outcomes[id] = await scopeRow(journey, targets, { id, params });

  expect(outcomes).toEqual(
    Object.fromEntries(
      actOperations.map(([id]) => [id, { ...owned, foreign: 'asks' }]),
    ),
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

// The caller's own Session comes last, so closing it ends the row.
async function scopeRow(
  journey: DelegationJourney,
  targets: Targets,
  operation: { id: OperationId; params: (sessionId: string) => Json },
): Promise<Record<string, string>> {
  const row: Record<string, string> = {};

  for (const target of ['foreign', 'unrelated', 'started', 'self'] as const)
    row[target] = await scopeOf(journey, {
      id: operation.id,
      params: operation.params(targets[target]),
    });

  return row;
}

async function scopeOf(
  journey: DelegationJourney,
  operation: { id: OperationId; params: Json },
): Promise<'runs' | 'asks'> {
  const asks = await journey.caller.caller.operations.run
    .mutate(operation)
    .then(
      () => false,
      (cause: unknown) => cause instanceof Error && cause.message === asked,
    );

  return asks ? 'asks' : 'runs';
}
