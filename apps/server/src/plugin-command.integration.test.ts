import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PluginManifest } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import { example, fixture, run } from '../mocks/plugin-cli';

it.each([
  ['process.cwd();', 'Node global process'],
  ["new URL('https://example.com');", 'Node global URL'],
  [
    "argo.slots.register('argo/composer/above/v1', () => null);",
    'Undeclared Slot',
  ],
  ["argo.on('unknown.event', () => null);", 'Unknown Hook event'],
])(
  'validate reports %s at its source line',
  async (body, reason) => {
    const directory = await fixture(
      `export function register(argo) {\n\n  ${body}\n}`,
    );

    const result = await run('validate', directory);
    expect(result).toMatchObject({
      code: 1,
      output: expect.stringContaining('index.tsx:3:'),
    });
    expect(result.output).toContain(reason);
  },
  30_000,
);

it.each([
  ['name', { name: 42 }],
  ['version', { version: 'one' }],
  ['argo', { engines: { argo: '*' } }],
])(
  'validate reports a bad manifest at its %s field',
  async (field, change) => {
    const directory = await fixture('export function register() {}');
    const file = join(directory, 'plugin.json');

    const manifest = PluginManifest.parse(
      JSON.parse(await readFile(file, 'utf8')),
    );

    const text = JSON.stringify({ ...manifest, ...change }, null, 2);
    await writeFile(file, text);

    const line = text
      .split('\n')
      .findIndex((row) => row.includes(`"${field}"`));

    const result = await run('validate', directory);
    expect(result).toMatchObject({
      code: 1,
      output: expect.stringContaining(`plugin.json:${line + 1}:`),
    });
  },
  30_000,
);

it('validate reports the hello Plugin contributions', async () => {
  expect(await run('validate', example)).toMatchObject({
    code: 0,
    output: expect.stringContaining('argo.slots.register'),
  });
}, 30_000);

it('test runs the hello Plugin worker interaction', async () => {
  expect(await run('test', example)).toMatchObject({
    code: 0,
    output: expect.stringContaining('PASS pressing Tap me'),
  });
}, 30_000);

it.each([
  ['assert.equal(1, 1)', 0, 'PASS'],
  ["assert.fail('fixture failure')", 1, 'fixture failure'],
])(
  'test returns the Plugin test outcome for %s',
  async (assertion, code, output) => {
    const directory = await fixture('export function register() {}');
    await writeFile(
      join(directory, 'hello.test.ts'),
      `
    import assert from 'node:assert/strict';
    import { test } from '@argo/plugin-kit/testing';
    test('fixture test', async () => { ${assertion}; });
  `,
    );
    expect(await run('test', directory)).toMatchObject({
      code,
      output: expect.stringContaining(output),
    });
  },
  30_000,
);

it.each([
  ['module.exports.register = function() {};', 'CommonJS exports'],
  [
    'export function register() { const process = {cwd: () => "local"}; process.cwd(); }',
    'a local name that shadows a Node global',
  ],
])(
  'validate accepts %s with %s',
  async (source) => {
    const directory = await fixture(source);
    // Without the example's `"type": "module"` package, Node reads the entry as CommonJS.
    await rm(join(directory, 'package.json'));
    expect(await run('validate', directory)).toMatchObject({ code: 0 });
  },
  30_000,
);
