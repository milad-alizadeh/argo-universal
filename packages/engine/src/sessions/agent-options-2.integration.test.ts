import {
  type CloseSessionRequest,
  type CreateElicitationResponse,
  type NewSessionRequest,
  type RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  collectOptions,
  optionsSessionId,
  optionsInput,
  optionsScenario,
} from './agent-options.test.mocks';

it('refuses a Permission request and an Elicitation the options Agent session asks', async () => {
  const closes: CloseSessionRequest[] = [];
  const permissions: RequestPermissionResponse[] = [];
  const elicitations: CreateElicitationResponse[] = [];

  const host = await startAcpEngine(
    optionsScenario(closes, {
      steps: [
        {
          type: 'permission',
          request: {
            toolCall: { toolCallId: 'write', title: 'Write a file' },
            options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }],
          },
          responses: permissions,
        },
        {
          type: 'elicitation',
          request: {
            mode: 'form',
            message: 'Which folder?',
            requestedSchema: { type: 'object', properties: {} },
          },
          responses: elicitations,
        },
      ],
    }),
  );

  await collectOptions(host.caller.session.agentOptions(optionsInput()));

  expect(permissions).toEqual([{ outcome: { outcome: 'cancelled' } }]);
  expect(elicitations).toEqual([{ action: 'cancel' }]);
});

it('closes the Agent session when its options cannot be read', async () => {
  const closes: CloseSessionRequest[] = [];

  const host = await startAcpEngine(
    optionsScenario(closes, {
      result: {
        sessionId: optionsSessionId,
        configOptions: [
          {
            id: 'mode',
            name: 'Mode',
            type: 'select',
            currentValue: 'code',
            options: [{ value: 'code', name: 'Code' }],
            _meta: { argo: { tone: 'unknown-tone' } },
          },
        ],
      },
    }),
  );

  await expect(
    collectOptions(host.caller.session.agentOptions(optionsInput())),
  ).rejects.toThrow('tone');
  expect(closes).toEqual([{ sessionId: optionsSessionId }]);
});

it('closes the Agent session that opens after the App stopped waiting for it', async () => {
  const closes: CloseSessionRequest[] = [];
  const opened = Promise.withResolvers<void>();
  const received = Promise.withResolvers<NewSessionRequest>();
  const closed = Promise.withResolvers<CloseSessionRequest>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      ...optionsScenario(closes, { waitFor: opened.promise, received })
        .responses,
      'session/close': [{ requests: closes, received: closed }],
    },
  });

  const reader = new AbortController();

  const reading = collectOptions(
    host
      .createCaller({ signal: reader.signal })
      .session.agentOptions(optionsInput()),
  );

  await received.promise;
  reader.abort();

  await expect(reading).rejects.toThrow('aborted');
  opened.resolve();

  await expect(closed.promise).resolves.toEqual({
    sessionId: optionsSessionId,
  });
});
