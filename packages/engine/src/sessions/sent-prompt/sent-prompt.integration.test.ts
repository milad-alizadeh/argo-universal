import { describe, expect, it } from 'vitest';
import { senders, sendingJourney } from './sent-prompt.test.mocks';

const extra = 'Also check the logs';

const refusal = 'The Agent did not accept steering; your Prompt was kept';

const everySender = Object.entries(senders);

const steeringSenders = everySender.filter(([, { type }]) => type !== 'plugin');

describe('a Prompt sent to an idle Session', () => {
  it.each(everySender)(
    'from %s starts a Turn and ends with it',
    async (_name, sender) => {
      const journey = await sendingJourney();
      const sent = await journey.send(extra, sender);

      expect(sent).toMatchObject({
        status: 'started',
        turnId: expect.any(String),
        messageId: expect.any(String),
      });
      expect(await sent.ended).toBe('turnId' in sent ? sent.turnId : '');
      expect(journey.requests).toHaveLength(1);
    },
    30_000,
  );
});

describe('a Prompt sent to a busy Session', () => {
  it.each(everySender)(
    'from %s waits in the queue when the Agent cannot be steered, and ends with its own Turn',
    async (_name, sender) => {
      const journey = await sendingJourney();
      await journey.busy();
      const sent = await journey.send(extra, sender);

      expect(sent).toMatchObject({
        status: 'queued',
        queuedId: expect.any(String),
        messageId: expect.any(String),
        notSteered: null,
      });
      journey.release();
      expect(await sent.ended).toBe('queuedId' in sent ? sent.queuedId : '');
      expect(journey.requests).toHaveLength(1);
    },
    30_000,
  );

  it.each(steeringSenders)(
    'from %s is steered into the running Turn when the Agent supports it',
    async (_name, sender) => {
      const journey = await sendingJourney({ steering: true });
      const running = await journey.busy();
      const sent = await journey.send(extra, sender);

      expect(sent).toMatchObject({
        status: 'steered',
        turnId: running,
        messageId: expect.stringContaining(':steer:'),
      });
      expect(JSON.stringify(await journey.steered)).toContain(extra);
      journey.release();
      expect(await sent.ended).toBe(running);
      expect(journey.requests).toHaveLength(0);
    },
    30_000,
  );

  it('from a Plugin waits its turn even when the Agent could be steered', async () => {
    const journey = await sendingJourney({ steering: true });
    await journey.busy();

    expect(await journey.send(extra, senders['a Plugin'])).toMatchObject({
      status: 'queued',
      notSteered: null,
    });
    journey.release();
    await expect.poll(() => journey.requests.length).toBe(1);
  }, 30_000);

  it.each(steeringSenders)(
    'from %s waits in the queue when the Agent refuses the steer, saying why',
    async (_name, sender) => {
      const journey = await sendingJourney({ steering: 'refused' });
      await journey.busy();

      expect(await journey.send(extra, sender)).toMatchObject({
        status: 'queued',
        notSteered: refusal,
      });
      journey.release();
      await expect.poll(() => journey.requests.length).toBe(1);
    },
    30_000,
  );
});

it('answers a Prompt a Hook dropped with why, and starts no Turn', async () => {
  const journey = await sendingJourney({ drop: 'Not today' });
  const sent = await journey.send(extra, senders['another Session']);

  expect(sent).toMatchObject({ status: 'dropped', drop: 'Not today' });
  expect(await sent.ended).toBeNull();
  expect(journey.requests).toHaveLength(0);
}, 30_000);
