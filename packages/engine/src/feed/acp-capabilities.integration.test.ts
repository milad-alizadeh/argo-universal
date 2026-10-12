import type { InitializeRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it('the real Client advertises implemented Plan, Notice, Compaction and URL Elicitation extensions', async () => {
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
  expect(await received.promise).toMatchObject({
    protocolVersion: 1,
    clientCapabilities: {
      plan: {},
      session: { notices: {}, compaction: {} },
      elicitation: { form: {}, url: {} },
    },
  });
});
