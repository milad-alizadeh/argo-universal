import type { OperationRow } from '@repo/contracts/operations';
import { PluginList } from '@repo/contracts/plugins';
import { PluginOperationContribution } from '@repo/contracts/plugins/plugin-operations';
import { expect, it } from 'vitest';
import { declaredOperations, operationRow } from './declared-operations';

const operation = PluginOperationContribution.parse({
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
    status: {
      type: 'string',
      description: 'open or closed.',
      choices: ['open', 'closed'],
    },
  },
  caller: ['project', 'session'],
});

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

it('publishes the declared params as a JSON Schema, with a Project to name', () => {
  expect(firstRow(list()).params).toEqual({
    type: 'object',
    additionalProperties: false,
    properties: {
      number: { type: 'number', description: 'The Issue number.' },
      status: {
        type: 'string',
        description: 'open or closed.',
        enum: ['open', 'closed'],
      },
      projectId: {
        type: 'string',
        description:
          "The Project to act in; the caller's own Project by default.",
      },
    },
    required: ['number'],
  });
});
