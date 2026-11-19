import { expect, it } from 'vitest';
import { firstQueued, startSteeringFixture } from '#mocks/queue-steering';
import type { TurnHappening } from './turn-happenings';

type Fixture = Awaited<ReturnType<typeof startSteeringFixture>>;

// Every Turn happening the Session reports from now on, in order.
function heard(fixture: Fixture): TurnHappening[] {
  const happenings: TurnHappening[] = [];
  const note = (happening: TurnHappening): number => happenings.push(happening);

  fixture.actor.on('*', note);

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
