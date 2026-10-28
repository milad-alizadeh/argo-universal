import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { operations, describeOperation } from './operations';

it('describes the Project list with schemas a caller can use', () => {
  const operation = operations['project.list'];
  expect(describeOperation(operation)).toMatchObject({
    id: 'project.list',
    label: 'List Projects',
    description: expect.stringContaining('Projects'),
    tier: 'read',
    params: { type: 'object', additionalProperties: false },
    result: { type: 'array', items: { type: 'object' } },
  });
  expect(
    z.fromJSONSchema(describeOperation(operation).params).parse({}),
  ).toEqual({});
});

it.each(Object.values(operations))(
  'publishes a discoverable contract for $id',
  (operation) => {
    const description = describeOperation(operation);

    expect(description).toMatchObject({
      id: expect.stringMatching(/^[a-z]+\.[a-z][A-Za-z]*$/),
      label: expect.stringMatching(/\S/),
      description: expect.stringMatching(/\S/),
      tier: expect.stringMatching(/^(read|act|confirm)$/),
      keywords: expect.arrayContaining([expect.any(String)]),
      params: expect.any(Object),
      result: expect.any(Object),
    });
  },
);

it('round-trips the result schema for an empty Project list', () => {
  const schema = describeOperation(operations['project.list']).result;

  expect(z.fromJSONSchema(schema).parse([])).toEqual([]);
});

it('describes Session configuration categories as strings in the result schema', () => {
  const description = describeOperation(operations['session.setConfigOption']);

  expect(description.result).toMatchObject({
    properties: {
      configOptions: {
        type: 'array',
        items: {
          oneOf: expect.arrayContaining([
            expect.objectContaining({
              properties: expect.objectContaining({
                category: { type: 'string' },
              }),
            }),
          ]),
        },
      },
    },
  });
});

it('gives every Operation a unique id that matches its registry key', () => {
  const ids = Object.values(operations).map(({ id }) => id);

  expect(new Set(ids).size).toBe(ids.length);

  for (const [key, operation] of Object.entries(operations)) {
    expect(operation.id).toBe(key);
  }
});

it.each(Object.values(operations))(
  'exports valid argument and result JSON schemas for $id',
  (operation) => {
    const description = describeOperation(operation);
    const compiler = addFormats(new Ajv({ strict: false }));

    expect(() => compiler.compile(description.params)).not.toThrow();
    expect(() => compiler.compile(description.result)).not.toThrow();
  },
);
