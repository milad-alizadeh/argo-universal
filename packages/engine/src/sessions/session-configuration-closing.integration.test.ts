import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { configuration } from './session-configuration-recovery.test.mocks';

it('keeps selected Read-only mode when the Agent reports defaults while closing', async () => {
  const host = await startAcpEngine({
    steps: [],
    configOptions: configuration,
    responses: {
      'session/close': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'config_option_update',
                configOptions: configuration,
              },
            },
          ],
        },
      ],
    },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  await host.caller.session.setConfigOption({
    ...created,
    configId: 'mode',
    type: 'id',
    value: 'read-only',
  });
  await host.caller.session.close(created);
  await host.caller.session.open(created);
  expect((await host.caller.session.get(created)).configOptions).toContainEqual(
    expect.objectContaining({ configId: 'mode', currentValue: 'read-only' }),
  );
});
