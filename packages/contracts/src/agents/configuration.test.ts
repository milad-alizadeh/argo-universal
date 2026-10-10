import { expect, it } from 'vitest';
import { AgentConfiguration, CustomAgentDefinition } from './configuration';

const definition = {
  name: 'Gemini CLI',
  executable: 'gemini',
  args: ['--experimental-acp', '$HOME; rm -rf /'],
  env: [{ name: 'GEMINI_MODEL', value: 'gemini-3-pro' }],
};

it.each(['gemini', '/opt/homebrew/bin/gemini', '/Applications/My Agent/agent'])(
  'accepts the executable %s',
  (executable) => {
    expect(
      CustomAgentDefinition.safeParse({ ...definition, executable }).success,
    ).toBe(true);
  },
);

it.each(['gemini --experimental-acp', 'bin/gemini', '', '   ', 'a\0b'])(
  'rejects the executable %j',
  (executable) => {
    expect(
      CustomAgentDefinition.safeParse({ ...definition, executable }).success,
    ).toBe(false);
  },
);

it('keeps arguments as separate literal strings', () => {
  expect(CustomAgentDefinition.parse(definition).args).toEqual(definition.args);
});

it.each(['--api-key=sk-123', '--token', '-password=x', '--auth-header'])(
  'rejects the credential-carrying argument %j',
  (argument) => {
    expect(
      CustomAgentDefinition.safeParse({ ...definition, args: [argument] })
        .success,
    ).toBe(false);
  },
);

it.each([
  { name: '1ABC', value: 'x' },
  { name: 'HAS SPACE', value: 'x' },
  { name: 'GEMINI_API_KEY', value: 'x' },
  { name: 'GITHUB_TOKEN', value: 'x' },
  { name: 'DB_PASSWORD', value: 'x' },
  { name: 'CLIENT_SECRET', value: 'x' },
  { name: 'MODE', value: 'a\0b' },
])('rejects the environment variable %j', (variable) => {
  expect(
    CustomAgentDefinition.safeParse({ ...definition, env: [variable] }).success,
  ).toBe(false);
});

it('rejects an environment variable named twice', () => {
  const env = [
    { name: 'MODE', value: 'a' },
    { name: 'MODE', value: 'b' },
  ];
  expect(CustomAgentDefinition.safeParse({ ...definition, env }).success).toBe(
    false,
  );
});

it('rejects a blank name and unknown keys', () => {
  expect(
    CustomAgentDefinition.safeParse({ ...definition, name: ' ' }).success,
  ).toBe(false);
  expect(
    CustomAgentDefinition.safeParse({ ...definition, shell: true }).success,
  ).toBe(false);
});

it('tells registry and custom configurations apart by source', () => {
  expect(
    AgentConfiguration.parse({
      source: 'registry',
      release: null,
      overrides: { args: [], env: [] },
    }).source,
  ).toBe('registry');
  expect(
    AgentConfiguration.parse({ source: 'custom', definition }).source,
  ).toBe('custom');
  expect(
    AgentConfiguration.safeParse({ source: 'custom', release: null }).success,
  ).toBe(false);
});
