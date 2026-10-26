import type { InitializeRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

it('Session connections advertise terminal auth, Subagents and implemented extensions without URL Elicitation', async () => {
  const received = Promise.withResolvers<InitializeRequest>();

  const host = await startAcpEngine({
    steps: [],
    initialize: {
      protocolVersion: 1,
      agentCapabilities: {
        sessionCapabilities: { close: {} },
      },
    },
    responses: { initialize: [{ received }] },
  });

  await host.caller.session.new(emptySessionInput);
  const initialization = await received.promise;
  expect(initialization).toMatchObject({
    protocolVersion: 1,
    clientCapabilities: {
      auth: { terminal: true },
      session: { notices: {}, compaction: {} },
      elicitation: { form: {} },
      subagents: {},
    },
  });
  expect(initialization.clientCapabilities?.elicitation).not.toHaveProperty(
    'url',
  );
  expect(initialization.clientCapabilities).not.toHaveProperty(
    '_meta.terminal-auth',
  );
});
