import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { firstQueued, startSteeringFixture } from '#mocks/queue-steering';
import { findMachineActor } from '../lib/machine-actor';
import { sessionActorId } from './open-sessions-machine';
import { sessionMachine, type SessionActorRef } from './session-machine';
import type { TurnHappening } from './turn-happenings';

type Reporting = { actor: Pick<SessionActorRef, 'on'> };

// Every Turn happening the Session reports from now on, in order.
function heard({ actor }: Reporting): TurnHappening[] {
  const happenings: TurnHappening[] = [];
  const note = (happening: TurnHappening): number => happenings.push(happening);

  actor.on('*', note);

  return happenings;
}

it('reports the running Turn a steered Prompt was taken into', async () => {
  const fixture = await startSteeringFixture();
  const turnId = fixture.actor.getSnapshot().context.activeTurnId;
  const row = firstQueued(fixture);
  const happenings = heard(fixture);

  const sent = fixture.caller.session.queue({
    sessionId: fixture.sessionId,
    command: { action: 'steer', id: row.id, revision: row.revision },
  });

  await fixture.received.promise;
  fixture.result.resolve({ outcome: 'injected' });
  await sent;

  expect(happenings).toEqual([
    { type: 'prompt.taken', queuedId: row.id, turnId },
  ]);
});

it("reports a Turn's end with its Stop reason, then the Turn the queue starts for the next Prompt", async () => {
  const fixture = await startSteeringFixture();
  const first = fixture.actor.getSnapshot().context.activeTurnId;
  const row = firstQueued(fixture);
  const happenings = heard(fixture);

  fixture.turnEnded.resolve();
  await expect.poll(() => happenings.length).toBeGreaterThanOrEqual(2);

  const [ended, taken] = happenings;

  expect(ended).toEqual({
    type: 'turn.ended',
    turnId: first,
    stopReason: 'end_turn',
    error: null,
  });
  expect(taken).toEqual({
    type: 'prompt.taken',
    queuedId: row.id,
    turnId: expect.any(String),
  });
  expect(taken?.turnId).not.toBe(first);
});

it('reports no queued Prompt taken when a draft is steered into the running Turn', async () => {
  const fixture = await startSteeringFixture();
  const happenings = heard(fixture);

  const sent = fixture.caller.session.submit({
    sessionId: fixture.sessionId,
    prompt: [{ type: 'text', text: 'Steer this draft' }],
    steer: true,
  });

  await fixture.received.promise;
  fixture.result.resolve({ outcome: 'injected' });
  await sent;

  expect(fixture.prompts).toHaveLength(1);
  expect(happenings).toEqual([]);
});

const agentFailure = 'The provider refused this Prompt';

it("reports a failed Turn's end with the Agent's error message", async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [{ error: { code: -32603, message: agentFailure } }],
    },
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);

  const actor = findMachineActor(
    host.engine.system,
    sessionActorId(sessionId),
    sessionMachine,
  );

  if (!actor) throw new Error('The Session is missing');

  const happenings = heard({ actor });

  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Fail' }],
  });

  await expect
    .poll(() => happenings)
    .toEqual([
      {
        type: 'turn.ended',
        turnId: expect.any(String),
        stopReason: 'error',
        error: agentFailure,
      },
    ]);
});
