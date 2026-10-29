import {
  type CloseSessionRequest,
  type NewSessionRequest,
  RequestError,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  collectOptions,
  optionsInput,
  optionsScenario,
} from './agent-options.test.mocks';

it('reports an Agent that needs sign-in as Send’s open would', async () => {
  const closes: CloseSessionRequest[] = [];

  const host = await startAcpEngine(
    optionsScenario(closes, {
      error: RequestError.authRequired().toErrorResponse(),
    }),
  );

  await expect(
    collectOptions(host.caller.session.agentOptions(optionsInput())),
  ).rejects.toMatchObject({ cause: { openError: { type: 'auth-required' } } });
});

it('returns persisted options before a silent refresh completes', async () => {
  const openings: NewSessionRequest[] = [];
  const refresh = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [
        { result: { sessionId: 'first', configOptions: acpConfiguration } },
        {
          waitFor: refresh.promise,
          requests: openings,
          result: { sessionId: 'second', configOptions: acpConfiguration },
        },
      ],
    },
  });

  const first = await collectOptions(
    host.caller.session.agentOptions(optionsInput()),
  );

  const stream = (await host.caller.session.agentOptions(optionsInput()))[
    Symbol.asyncIterator
  ]();

  const cached = await stream.next();
  expect(cached.value).toMatchObject({ configOptions: first });
  const fresh = stream.next();
  await expect.poll(() => openings.length).toBe(1);
  refresh.resolve();
  expect((await fresh).value).toMatchObject({ configOptions: first });
  await stream.return?.();
});
