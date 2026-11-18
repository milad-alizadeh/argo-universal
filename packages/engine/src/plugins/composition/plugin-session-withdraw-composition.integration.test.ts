import { PluginPromptAnswer } from '@repo/contracts/plugins/argo-calls';
import { expect, it, vi } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { busyJourney, text, type PromptJourney } from '#mocks/session-prompter';

const queuedIdOf = async (
  journey: PromptJourney,
  message: string,
): Promise<string> => {
  const { result } = await journey.run(journey.session.sessionId, message);
  const answer = PluginPromptAnswer.parse(result);

  if (answer.status === 'queued') return answer.queuedId;

  throw new Error(`The Prompt did not queue: ${JSON.stringify(result)}`);
};

// A Session whose first Turn is held open, so the Plugin's next Prompt queues.
async function queuedJourney(): Promise<PromptJourney> {
  const journey = await busyJourney();
  await journey.run(journey.session.sessionId, 'First');
  await journey.entered.promise;

  return journey;
}

const queuedTexts = async (journey: PromptJourney): Promise<unknown[]> =>
  (
    await waitForAcpSnapshot(
      journey.host,
      journey.session.sessionId,
      () => true,
    )
  ).promptQueue.items.map(({ prompt }) => prompt);

it('takes back a Prompt the Plugin queued, so it never starts', async () => {
  const journey = await queuedJourney();
  const stale = await queuedIdOf(journey, 'Stale');
  await queuedIdOf(journey, 'Fresh');

  await expect(
    journey.withdraw(journey.session.sessionId, stale),
  ).resolves.toEqual({ result: { withdrawn: true } });
  expect(await queuedTexts(journey)).toEqual([text('Fresh')]);
  journey.release.resolve();
  await vi.waitFor(() => expect(journey.requests).toHaveLength(2));

  expect(journey.requests.map(({ prompt }) => prompt)).toEqual([
    text('First'),
    text('Fresh'),
  ]);
}, 30_000);

it('refuses to take back the person’s Prompt', async () => {
  const journey = await queuedJourney();
  await journey.host.caller.session.submit({
    sessionId: journey.session.sessionId,
    prompt: text('Mine'),
  });

  const snapshot = await waitForAcpSnapshot(
    journey.host,
    journey.session.sessionId,
    ({ promptQueue }) => promptQueue.items.length === 1,
  );

  const [mine] = snapshot.promptQueue.items;

  await expect(
    journey.withdraw(journey.session.sessionId, mine?.id ?? ''),
  ).rejects.toThrow('not sent by this Plugin');
  expect(await queuedTexts(journey)).toEqual([text('Mine')]);
  journey.release.resolve();
}, 30_000);

it('leaves a Prompt that already started, and answers not withdrawn', async () => {
  const journey = await queuedJourney();
  const queuedId = await queuedIdOf(journey, 'Later');
  journey.release.resolve();
  await vi.waitFor(() => expect(journey.requests).toHaveLength(2));

  await expect(
    journey.withdraw(journey.session.sessionId, queuedId),
  ).resolves.toEqual({ result: { withdrawn: false } });
  expect(journey.requests.map(({ prompt }) => prompt)).toEqual([
    text('First'),
    text('Later'),
  ]);
}, 30_000);
