import { expect, it } from 'vitest';
import { supportsSteering } from './steering';

const codexAdapter = '@agentclientprotocol/codex-acp';

it.each([
  [codexAdapter, '2.4.0', true],
  [codexAdapter, '2.6.0', true],
  [codexAdapter, '2.3.0', false],
  ['@agentclientprotocol/claude-agent-acp', '0.97.0', true],
  ['claude-agent-acp', '0.96.0', false],
  ['unknown', '99.0.0', false],
  [codexAdapter, 'invalid', false],
] as const)('negotiates safe steering for %s %s', (name, version, expected) => {
  expect(
    supportsSteering({
      protocolVersion: 1,
      agentInfo: { name, version },
      _meta: { steering: { supported: true } },
    }),
  ).toBe(expected);
});

it.each([undefined, {}, { steering: { supported: false } }])(
  'requires explicit capability advertisement: %j',
  (_meta) => {
    expect(
      supportsSteering({
        protocolVersion: 1,
        agentInfo: { name: codexAdapter, version: '2.4.0' },
        _meta,
      }),
    ).toBe(false);
  },
);
