import { expect, it } from 'vitest';
import { addOtherProject } from '#mocks/session-access';
import { busyJourney, senders, text } from '#mocks/session-prompter';

it('starts a Turn on an idle Session with the Plugin as sender and answers started', async () => {
  const journey = await busyJourney();

  await expect(
    journey.run(journey.session.sessionId, 'From plugin'),
  ).resolves.toEqual({ result: { status: 'started' } });
  await journey.entered.promise;
  expect(await senders(journey)).toEqual([
    [
      JSON.stringify(text('From plugin')),
      { type: 'plugin', pluginId: 'prompter', title: 'Prompter' },
    ],
  ]);
  journey.release.resolve();
}, 30_000);

it('refuses and logs the call when the Plugin did not declare sessions:prompt', async () => {
  const journey = await busyJourney([]);

  await expect(journey.run(journey.session.sessionId, 'Nope')).rejects.toThrow(
    'sessions:prompt is not a declared Capability',
  );
  expect(journey.requests).toHaveLength(0);
}, 30_000);

it('refuses a Session that belongs to another Project than the call runs for', async () => {
  const journey = await busyJourney();
  const otherProject = await addOtherProject(journey.host);

  await expect(
    journey.run(journey.session.sessionId, 'Nope', otherProject),
  ).rejects.toThrow('not in the Project');
  expect(journey.requests).toHaveLength(0);
}, 30_000);
