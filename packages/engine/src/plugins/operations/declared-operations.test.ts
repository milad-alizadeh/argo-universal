import type { OperationRow } from '@repo/contracts/operations';
import { PluginList } from '@repo/contracts/plugins';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import {
  checkParams,
  declaredOperations,
  operationRow,
} from './declared-operations';

const operation = {
  name: 'attach',
  label: 'Attach Issue to Session',
  description: 'Connect the calling Session to an Issue.',
  tier: 'act',
  params: {
    number: {
      type: 'number',
      description: 'The Issue number.',
      required: true,
    },
    projectId: { type: 'string', description: 'The Project.' },
  },
} as const;

const manifest = {
  id: 'issue-tracker',
  name: 'Issue tracker',
  version: '1.0.0',
  engines: { argo: '>=0.0.0 <2' },
  main: 'index.tsx',
  icon: { material: 'extension' },
  contributes: { nav: [], operations: [operation] },
};

const list = (enabled = true): PluginList =>
  PluginList.parse({
    plugins: [
      {
        manifest,
        firstParty: true,
        enabled,
        state: 'not-started',
        hanging: false,
        error: null,
      },
    ],
    errors: [],
  });

// Every row test reads the one Operation the fixture Plugin declares.
const firstRow = (plugins: PluginList): OperationRow => {
  const [declared] = declaredOperations(plugins);

  if (!declared) throw new Error('Expected one declared Operation');

  return operationRow(declared);
};

it('names a Plugin Operation after the Plugin that answers it', () => {
  expect(firstRow(list())).toMatchObject({
    id: 'issue-tracker.attach',
    label: 'Attach Issue to Session',
    tier: 'act',
    enabled: true,
    disabledReason: null,
  });
});

it('lists an Operation of a Plugin that is turned off, and says so', () => {
  expect(firstRow(list(false))).toMatchObject({
    enabled: false,
    disabledReason: 'Issue tracker is turned off',
  });
});

it('publishes the declared params as a JSON Schema', () => {
  expect(firstRow(list()).params).toEqual({
    type: 'object',
    additionalProperties: false,
    properties: {
      number: { type: 'number', description: 'The Issue number.' },
      projectId: { type: 'string', description: 'The Project.' },
    },
    required: ['number'],
  });
});

it('passes on the declared params, leaving out the ones not given', () => {
  expect(checkParams(operation.params, { number: 1320 })).toEqual({
    number: 1320,
  });
});

const refusals: [string, Json, string][] = [
  [
    'a param the Plugin never declared',
    { number: 1, other: 2 },
    'Unknown param other',
  ],
  ['a missing required param', { projectId: 'p' }, 'Param number is required'],
  [
    'a param of the wrong type',
    { number: '1320' },
    'Param number must be a number',
  ],
  ['params that are not an object', [1], 'Params must be a JSON object'],
];

it.each(refusals)('refuses %s', (_name, given, message) => {
  expect(() => checkParams(operation.params, given)).toThrow(message);
});

it('reads no params at all as none given', () => {
  expect(checkParams({}, null)).toEqual({});
});
