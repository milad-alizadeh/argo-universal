import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { expect, it } from 'vitest';
import { describeOperation } from './index';
import { registryOperations } from './registry';
import {
  InstalledAgentResult,
  RegistryEntry,
  RegistryResult,
} from './registry-results';
import { validRegistryEntry as entry } from './registry-results.mocks';

it('uses the official Registry schema for Operation results', () => {
  expect(RegistryEntry.parse(entry)).toEqual(entry);
  expect(
    RegistryEntry.safeParse({ ...entry, license_url: undefined }).success,
  ).toBe(false);
});

it('preserves official Registry rules and references in discovery JSON Schema', () => {
  const schema = describeOperation(registryOperations['registry.get']).result;
  const accepts = addFormats(new Ajv({ strict: false })).compile(schema);
  const valid = { agents: [{ entry, support: 'npx' }], error: null };

  expect(accepts(valid)).toBe(true);
  expect(RegistryResult.parse(valid)).toEqual(valid);
  expect(
    accepts({
      agents: [
        {
          entry: { ...entry, distribution: { npx: { package: 42 } } },
          support: 'npx',
        },
      ],
      error: null,
    }),
  ).toBe(false);
});

it('describes Installed Agents with the same schema that checks their results', () => {
  const schema = describeOperation(registryOperations['agent.list']).result;
  const accepts = addFormats(new Ajv({ strict: false })).compile(schema);

  const valid = [
    {
      id: 'example-agent',
      name: 'Example',
      version: '1.2.3',
      env: { TOKEN: 'value' },
    },
  ];

  expect(accepts(valid)).toBe(true);
  expect(InstalledAgentResult.array().parse(valid)).toEqual(valid);
  expect(
    accepts([
      {
        id: 'example-agent',
        name: 'Example',
        version: '1.2.3',
        env: { TOKEN: 42 },
      },
    ]),
  ).toBe(false);
});
