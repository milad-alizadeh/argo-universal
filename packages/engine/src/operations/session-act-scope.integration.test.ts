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
import { runOperation } from '#mocks/operations';
import { addOtherProject } from '#mocks/session-access';
import {
  delegationJourney,
  startDelegated,
  type DelegationJourney,
} from '#mocks/session-delegation';

const Refusal = z.object({
  message: z.string(),
  data: z.object({ code: z.string() }),
});

type Targets = Record<'self' | 'started' | 'unrelated' | 'foreign', string>;

// Without a held Turn, a call its scope would ask about is refused before it runs.
const asked = 'A Permission request requires an active Turn';

// `ranWith` is the implementation's own refusal, `code: message`: the call still ran past its scope.
type ActOperation = {
  id: OperationId;
  params: (sessionId: string) => Json;
  ranWith?: string;
};

const configOption = { configId: 'mode', type: 'id', value: 'x' };

const actOperations: ActOperation[] = [
  {
    id: 'session.rename',
    params: (sessionId) => ({ sessionId, title: 'Renamed' }),
  },
  {
    id: 'session.setConfigOption',
    params: (sessionId) => ({ sessionId, ...configOption }),
    ranWith: 'BAD_REQUEST: The Agent did not offer mode=x',
  },
  {
    id: 'shell.stop',
    params: (sessionId) => ({ sessionId, shellId: 'no-shell' }),
    ranWith: 'NOT_FOUND: No Shell in this Session',
  },
  {
    id: 'session.cancel',
    params: (sessionId) => ({ sessionId }),
    ranWith: `CONFLICT: Session cannot accept session.cancel in {"open":{"acp":"idle"}}`,
  },
];

const ownedRow = {
  self: 'ran',
  started: 'ran',
  unrelated: 'ran',
  foreign: 'ran',
};

// The caller's own scope is itself and the Sessions it started in its Project: those run, any other asks.
it('runs routine Session Operations regardless of Project and starter', async () => {
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

async function startForeign(journey: DelegationJourney): Promise<string> {
  const projectId = await addOtherProject(journey.host);

  const { sessionId } = SessionNewOutput.parse(
    OperationExecution.parse(
      await runOperation(journey.caller.caller.operations, {
        id: 'session.new',
        wait: true,
        params: {
          ...emptySessionInput,
          projectId,
          prompt: [{ type: 'text', text: 'Foreign' }],
        },
      }),
    ).result,
  );

  await waitForAcpSessionIdle(journey.host, sessionId);

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
  const run = { id, params: params(sessionId) };

  return journey.caller.caller.operations.run.mutate(run).then(
    () => 'ran',
    (cause: unknown) => refusal(cause, ranWith),
  );
}

function refusal(cause: unknown, ranWith?: string): string {
  const refused = describeRefusal(cause);

  if (refused === `CONFLICT: ${asked}`) return 'asked';

  return refused === ranWith ? 'ran' : `unexpected ${refused}`;
}

function describeRefusal(cause: unknown): string {
  const parsed = Refusal.safeParse(cause);

  return parsed.success
    ? `${parsed.data.data.code}: ${parsed.data.message}`
    : String(cause);
}
