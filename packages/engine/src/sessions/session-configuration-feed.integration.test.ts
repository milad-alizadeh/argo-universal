import { expect, it, onTestFinished } from 'vitest';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import {
  startSessionJourney,
  sessionConfiguration,
} from '#mocks/session-journey';

it('returns the chosen config value and delivers later Agent changes through the Feed', async (): Promise<void> => {
  const { caller, agent, createCaller } = await startSessionJourney([
    'small',
    'large',
  ]);
  const sessionId = 'session-1';
  await caller.session.setConfigOption({
    sessionId,
    configId: 'model',
    type: 'id',
    value: 'small',
  });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const updates = await createCaller({
    signal: controller.signal,
  }).feed.subscribe({ sessionId, after: null });
  const iterator = updates[Symbol.asyncIterator]();
  await iterator.next();
  expect(
    await caller.session.setConfigOption({
      sessionId,
      configId: 'model',
      type: 'id',
      value: 'large',
    }),
  ).toMatchObject({
    configOptions: [{ configId: 'model', currentValue: 'large' }],
  });
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [{ currentValue: 'large' }] },
  });
  const process = requireScriptedProcessAt(agent.processes);
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: sessionConfiguration.map((option) => ({
            ...option,
            name: 'Renamed',
          })),
        },
      },
    ],
    'owned-1',
  );
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [{ name: 'Renamed', currentValue: 'small' }] },
  });
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: sessionConfiguration.map((option) => ({
            ...option,
            currentValue: 'large',
          })),
        },
      },
    ],
    'owned-1',
  );
  expect((await iterator.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { configOptions: [{ currentValue: 'large' }] },
  });
  controller.abort();
  await iterator.return?.();
});
