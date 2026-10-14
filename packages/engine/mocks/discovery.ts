import type { CloseSessionRequest } from '@agentclientprotocol/sdk';
import type { ScriptedResponses } from '@repo/mocks/agent/scripted-responses';

type CloseRequests = CloseSessionRequest[];

type DiscoveryFailure = {
  failure: string;
  scenario: (closes: CloseRequests) => ScriptedResponses;
  expectedCloses: CloseRequests;
  message: RegExp;
};

export const discoveryFailures: DiscoveryFailure[] = [
  {
    failure: 'opening',
    message: /opening refused/,
    expectedCloses: [],
    scenario: (closes) => ({
      'session/new': [{ error: 'opening refused' }],
      'session/close': [{ requests: closes }],
    }),
  },
  {
    failure: 'configuration',
    message: /Invalid option/,
    expectedCloses: [{ sessionId: 'owned-1' }],
    scenario: (closes) => ({
      'session/new': [
        {
          result: {
            sessionId: 'owned-1',
            configOptions: [
              {
                id: 'mode',
                name: 'Mode',
                type: 'select',
                currentValue: 'code',
                options: [],
                _meta: { argo: { tone: 'unsupported' } },
              },
            ],
          },
        },
      ],
      'session/close': [{ requests: closes }],
    }),
  },
  {
    failure: 'close',
    message: /Internal error/,
    expectedCloses: [{ sessionId: 'owned-1' }],
    scenario: (closes) => ({
      'session/close': [{ requests: closes, error: 'close refused' }],
    }),
  },
];
