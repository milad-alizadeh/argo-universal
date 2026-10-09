import type { InitializeRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it('the real Client advertises only implemented Plan, Notice and Compaction extensions', async () => {
  const received = Promise.withResolvers<InitializeRequest>();
  const host = await startAcpEngine({
    initialize: ({ params }) => {
      received.resolve(params);
      return {
        protocolVersion: 1,
        agentCapabilities: { sessionCapabilities: { close: {} } },
      };
    },
  });
  await host.caller.session.new(emptySessionInput);
  expect(await received.promise).toMatchObject({
    protocolVersion: 1,
    clientCapabilities: { plan: {}, session: { notices: {}, compaction: {} } },
  });
});
