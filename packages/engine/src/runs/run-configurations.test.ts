import { expect, it } from 'vitest';
import { readRunConfigurations } from './run-configurations';

const read = (source: string): ReturnType<typeof readRunConfigurations> =>
  readRunConfigurations(source);

it('reads a Run Configuration with its defaults filled in', () => {
  expect(
    read('{ "configurations": [{ "name": "web", "command": "pnpm dev" }] }'),
  ).toEqual({
    ok: true,
    configurations: [{ name: 'web', command: 'pnpm dev', cwd: '.', env: {} }],
    groups: {},
  });
});

it('reads cwd, env, port, url and a ready pattern', () => {
  const result = read(`{
    "configurations": [{
      "name": "web", "command": "vite", "cwd": "apps/web",
      "env": { "MODE": "dev" }, "port": 5173,
      "url": "http://localhost:$PORT/app", "ready": { "pattern": "Local:" }
    }]
  }`);

  expect(result).toMatchObject({
    ok: true,
    configurations: [
      {
        cwd: 'apps/web',
        env: { MODE: 'dev' },
        port: 5173,
        url: 'http://localhost:$PORT/app',
        ready: { pattern: 'Local:' },
      },
    ],
  });
});

it('reads a ready request that waits for the port to listen', () => {
  expect(
    read(
      '{ "configurations": [{ "name": "api", "command": "x", "ready": { "port": true } }] }',
    ),
  ).toMatchObject({
    ok: true,
    configurations: [{ ready: { port: true } }],
  });
});

it('reads JSONC comments and trailing commas', () => {
  expect(
    read(`{
      // the dev server
      "configurations": [
        { "name": "web", "command": "pnpm dev", /* later */ },
      ],
    }`),
  ).toMatchObject({ ok: true, configurations: [{ name: 'web' }] });
});

it('reads groups with their default', () => {
  expect(
    read(`{
      "configurations": [
        { "name": "web", "command": "a" }, { "name": "server", "command": "b" }
      ],
      "groups": { "dev": { "members": ["web", "server"], "stopAll": true } },
      "default": "dev"
    }`),
  ).toMatchObject({
    ok: true,
    groups: { dev: { members: ['web', 'server'], stopAll: true } },
    default: 'dev',
  });
});

it('reads an empty object as no Run Configurations', () => {
  expect(read('{}')).toEqual({ ok: true, configurations: [], groups: {} });
});

it('says where a syntax error is', () => {
  const result = read(
    '{\n  "configurations": [\n    { "name": "web" "command": "x" }\n  ]\n}',
  );

  expect(result).toMatchObject({
    ok: false,
    error: { line: 3, column: 21 },
  });
  expect(result.ok ? '' : result.error.message).toContain('3:21');
});

it('says where a field has the wrong shape', () => {
  const result = read(
    '{\n  "configurations": [\n    { "name": "web", "command": 5 }\n  ]\n}',
  );

  expect(result).toMatchObject({ ok: false, error: { line: 3 } });
  expect(result.ok ? '' : result.error.message).toMatch(
    /configurations\.0\.command/,
  );
});

it('says where a missing command is', () => {
  const result = read('{ "configurations": [{ "name": "web" }] }');

  expect(result).toMatchObject({ ok: false, error: { line: 1 } });
  expect(result.ok ? '' : result.error.message).toMatch(/command/);
});

it('refuses a file that is not an object, rather than reading none', () => {
  expect(read('[]')).toMatchObject({ ok: false });
  expect(read('')).toMatchObject({ ok: false });
});

it('refuses an unknown field, since a typo would otherwise be ignored', () => {
  const result = read(
    '{ "configurations": [{ "name": "web", "command": "x", "comand": "y" }] }',
  );

  expect(result).toMatchObject({ ok: false });
  expect(result.ok ? '' : result.error.message).toMatch(/comand/);
});

it('refuses two Run Configurations with one name, at the second', () => {
  const result = read(
    '{\n"configurations": [\n{ "name": "web", "command": "a" },\n{ "name": "web", "command": "b" }\n]\n}',
  );

  expect(result).toMatchObject({ ok: false, error: { line: 4 } });
  expect(result.ok ? '' : result.error.message).toMatch(/web/);
});

it('refuses a group member that is no Run Configuration', () => {
  const result = read(
    '{ "configurations": [{ "name": "web", "command": "a" }], "groups": { "dev": { "members": ["web", "nope"] } } }',
  );

  expect(result).toMatchObject({ ok: false });
  expect(result.ok ? '' : result.error.message).toMatch(/nope/);
});

it('refuses a default that is no group', () => {
  const result = read('{ "configurations": [], "default": "dev" }');

  expect(result).toMatchObject({ ok: false });
  expect(result.ok ? '' : result.error.message).toMatch(/dev/);
});

it.each(['(', String.raw`\a`])(
  'refuses an invalid ready pattern %s',
  (pattern) => {
    const result = read(
      JSON.stringify({
        configurations: [{ name: 'web', command: 'a', ready: { pattern } }],
      }),
    );

    expect(result).toMatchObject({ ok: false });
    expect(result.ok ? '' : result.error.message).toMatch(/pattern/);
  },
);
