import { expect, it } from 'vitest';
import { readNpmCommands } from './npm-package';

const unscopedName = 'agent-acp';

it.each([
  {
    case: 'a string bin, named after the package',
    name: 'cline',
    metadata: { bin: 'dist/cli.mjs' },
    commands: ['cline'],
  },
  {
    case: 'a string bin of a scoped package, named without the scope',
    name: '@scope/agent',
    metadata: { bin: 'cli.js' },
    commands: ['agent'],
  },
  {
    case: 'one bin of a scoped package',
    name: '@google/gemini-cli',
    metadata: { bin: { gemini: 'bundle/gemini.js' } },
    commands: ['gemini'],
  },
  {
    case: 'the bin named like the scoped package among others',
    name: '@scope/agent',
    metadata: { bin: { agent: 'a.js', helper: 'b.js' } },
    commands: ['agent'],
  },
  {
    case: 'aliases of one file',
    name: '@kilocode/cli',
    metadata: { bin: { kilo: 'bin/kilo', kilocode: 'bin/kilo' } },
    commands: ['kilo', 'kilocode'],
  },
  {
    case: 'several files, none named like the package',
    name: unscopedName,
    metadata: { bin: { one: 'a.js', two: 'b.js' } },
    commands: [],
  },
  {
    case: 'no bin',
    name: unscopedName,
    metadata: { name: unscopedName },
    commands: [],
  },
  {
    case: 'an answer that is not metadata',
    name: unscopedName,
    metadata: 'Not Found',
    commands: [],
  },
  {
    case: 'a name leaving its directory',
    name: unscopedName,
    metadata: { bin: { '../agent': 'a.js' } },
    commands: [],
  },
  {
    case: 'a name with a slash',
    name: unscopedName,
    metadata: { bin: { 'bin/agent': 'a.js' } },
    commands: [],
  },
  {
    case: 'a hidden name',
    name: unscopedName,
    metadata: { bin: { '.agent': 'a.js' } },
    commands: [],
  },
  {
    case: 'an unsafe alias beside a safe one',
    name: unscopedName,
    metadata: { bin: { agent: 'a.js', '../agent': 'a.js' } },
    commands: ['agent'],
  },
])(
  'npm metadata with $case names $commands',
  ({ name, metadata, commands }) => {
    expect(readNpmCommands(JSON.stringify(metadata), name)).toEqual(commands);
  },
);

it('npm text that is not JSON names no command', () => {
  expect(readNpmCommands('<html>Not Found</html>', unscopedName)).toEqual([]);
});
