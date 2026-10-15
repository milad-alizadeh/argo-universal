import type { InitializeRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it('Session connections advertise implemented extensions without URL Elicitation', async () => {
  const received = Promise.withResolvers<InitializeRequest>();

  const host = await startAcpEngine({
    steps: [],
    initialize: {
      protocolVersion: 1,
      agentCapabilities: {
        sessionCapabilities: { close: {} },
        _meta: { authStatus: {} },
      },
    },
    responses: { initialize: [{ received }] },
  });

  await host.caller.session.new(emptySessionInput);
  const initialization = await received.promise;
  expect(initialization).toMatchObject({
    protocolVersion: 1,
    clientCapabilities: {
      session: { notices: {}, compaction: {} },
      elicitation: { form: {} },
    },
  });
  expect(initialization.clientCapabilities?.elicitation).not.toHaveProperty(
    'url',
  );
});
