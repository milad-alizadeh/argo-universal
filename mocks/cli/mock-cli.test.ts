import { afterEach, expect, it, vi } from 'vitest';
import { mockCliScenarioEnvironment, readMockCliEnvironment } from './mock-cli';

afterEach(() => {
  vi.unstubAllEnvs();
});

const stubShim = () => {
  vi.stubEnv('MOCK_CLI_RECORDING', '/recording.json');
  vi.stubEnv('MOCK_CLI_EXIT_MID_TURN', '0');
};

it('gives every scenario field its default when the variable is absent', () => {
  stubShim();
  expect(readMockCliEnvironment().scenario).toEqual({
    processFile: null,
    blockInitialize: false,
    blockTurnStart: false,
    turnResponseAfterNextStart: false,
    requestBeforeStartResponse: false,
    completionBeforeResponse: false,
    interruptError: 'none',
    notificationsFirst: false,
    account: 'subscription',
    transcriptFile: null,
    requestAnswersFile: null,
  });
});

it('carries a scenario through one environment variable', () => {
  stubShim();
  for (const [key, value] of Object.entries(
    mockCliScenarioEnvironment({ blockTurnStart: true, account: 'apiKey' }),
  ))
    vi.stubEnv(key, value);
  expect(readMockCliEnvironment().scenario).toMatchObject({
    blockTurnStart: true,
    account: 'apiKey',
    blockInitialize: false,
  });
});

it('rejects a misspelt field where the scenario is written', () => {
  expect(() =>
    mockCliScenarioEnvironment({ blockTurnstart: true } as never),
  ).toThrow(/Unrecognized key/);
});
