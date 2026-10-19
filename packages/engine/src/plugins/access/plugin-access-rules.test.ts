import { expect, it } from 'vitest';
import { childEnvironment } from './plugin-access-rules';

const ghToken = 'GH_TOKEN';

const ghCapability = {
  kind: 'process:exec' as const,
  command: 'gh',
  args: [],
  env: [ghToken],
};

const commandToken = 'command-token';

it('passes only declared host variables with the inherited process environment', () => {
  expect(
    childEnvironment({}, [ghCapability], {
      PATH: '/login/bin:/usr/bin',
      HOME: '/home/user',
      LANG: 'en_GB.UTF-8',
      TMPDIR: '/tmp',
      [ghToken]: 'fixture-token',
      GH_CONFIG_DIR: '/private/config',
      OTHER: 'not passed',
    }),
  ).toEqual({
    PATH: '/login/bin:/usr/bin',
    HOME: '/home/user',
    LANG: 'en_GB.UTF-8',
    TMPDIR: '/tmp',
    [ghToken]: 'fixture-token',
  });
});

it('lets a Plugin override a declared variable for one command', () => {
  expect(
    childEnvironment({ [ghToken]: commandToken }, [ghCapability], {
      PATH: '/usr/bin',
      [ghToken]: 'host-token',
    }),
  ).toMatchObject({ [ghToken]: commandToken });
});

it('refuses a requested variable without a matching declaration', () => {
  expect(() =>
    childEnvironment({ [ghToken]: commandToken }, [], { PATH: '/usr/bin' }),
  ).toThrow(`${ghToken} is not a declared variable`);
});
