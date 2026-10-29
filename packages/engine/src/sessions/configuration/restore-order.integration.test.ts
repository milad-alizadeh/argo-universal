import type { SetSessionConfigOptionRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { configuration } from './restore.test.mocks';

it('restores model-dependent choices in model, effort, mode order before the follow-up', async () => {
  const requests: SetSessionConfigOptionRequest[] = [];
  const initial = [...configuration].reverse();

  const afterModel = initial.map((option) =>
    option.id === 'model' && option.type === 'select'
      ? { ...option, currentValue: 'small' }
      : option,
  );

  const afterEffort = afterModel.map((option) =>
    option.id === 'effort' && option.type === 'select'
      ? { ...option, currentValue: 'low' }
      : option,
  );

  const selected = afterEffort.map((option) =>
    option.id === 'mode' && option.type === 'select'
      ? { ...option, currentValue: 'read-only' }
      : option,
  );

  const responses = [
    afterModel,
    afterEffort,
    selected,
    afterModel,
    afterEffort,
    selected,
  ].map((configOptions) => ({ requests, result: { configOptions } }));

  const host = await startAcpEngine({
    steps: [],
    configOptions: initial,
    responses: { 'session/set_config_option': responses },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);

  for (const [configId, value] of [
    ['model', 'small'],
    ['effort', 'low'],
    ['mode', 'read-only'],
  ] as const)
    await host.caller.session.setConfigOption({
      ...created,
      configId,
      type: 'id',
      value,
    });
  await host.caller.session.close(created);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Next' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  expect(
    requests.slice(3).map(({ configId, value }) => ({ configId, value })),
  ).toEqual([
    { configId: 'model', value: 'small' },
    { configId: 'effort', value: 'low' },
    { configId: 'mode', value: 'read-only' },
  ]);
  expect((await host.caller.session.get(created)).configOptions).toMatchObject([
    { configId: 'fast', currentValue: false },
    { configId: 'mode', currentValue: 'read-only' },
    { configId: 'effort', currentValue: 'low' },
    { configId: 'model', currentValue: 'small' },
  ]);
});
