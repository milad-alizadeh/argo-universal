import { expect, it } from 'vitest';
import { z } from 'zod';
import { wirePart } from './kit';
import { pluginPartSchemas } from './plugin-part-schemas';
import {
  partEventPayload,
  partEventRules,
  PluginDispatchInput,
  type WireJson,
} from './wire';

// One example of each payload shape a kit part reports.
const examples: (WireJson | undefined)[] = [undefined, true, 1, 'a', ['a']];

const partEvents = Object.entries(pluginPartSchemas).flatMap(([type, part]) =>
  Object.entries(part.events).map(([event, schema]) => ({
    type,
    event,
    schema,
    props: part.props,
  })),
);

// Every option of a union part, so a prop declared on any variant counts.
function propSchemas(schema: z.core.$ZodType, name: string): z.ZodType[] {
  if (schema instanceof z.ZodUnion)
    return schema.options.flatMap((option) => propSchemas(option, name));

  return schema instanceof z.ZodObject ? propOf(schema, name) : [];
}

const propOf = (schema: z.ZodObject, name: string): z.ZodType[] =>
  name in schema.shape ? [schema.shape[name]] : [];

const accepts = (schema: z.ZodType, example?: WireJson): boolean =>
  schema.safeParse(example).success;

it.each(partEvents)(
  '$type.$event parses a kit example of its payload',
  ({ schema }) => {
    expect(examples.some((example) => accepts(schema, example))).toBe(true);
  },
);

it.each(partEvents.filter(({ schema }) => partEventRules(schema).value))(
  '$type.$event echoes into a prop that takes its payload',
  ({ schema, props }) => {
    const prop = propSchemas(props, partEventRules(schema).value ?? '');

    const values = examples.filter(
      (example) =>
        example !== undefined && prop.some((p) => accepts(p, example)),
    );

    expect(prop).not.toHaveLength(0);
    expect(values).not.toHaveLength(0);
    expect(values.every((value) => accepts(schema, value))).toBe(true);
  },
);

it.each([
  { type: 'Button', event: 'onPress', payload: undefined },
  { type: 'TextInput', event: 'onChangeText', payload: 'draft' },
  { type: 'Switch', event: 'onValueChange', payload: true },
  { type: 'List.Section', event: 'onSelectionChange', payload: ['alpha'] },
  { type: 'Sheet', event: 'onOpenChange', payload: false },
])(
  'checks $type.$event against the part schema',
  ({ type, event, payload }) => {
    const schema = wirePart(type)?.events[event];

    expect(partEventPayload(schema, payload)).toEqual(payload);
  },
);

it.each([
  { type: 'Button', event: 'onPress', payload: 'unexpected' },
  { type: 'TextInput', event: 'onChangeText', payload: 42 },
  { type: 'Switch', event: 'onValueChange', payload: 'enabled' },
  { type: 'List.Section', event: 'onSelectionChange', payload: ['a', 42] },
  { type: 'Button', event: 'invented', payload: 'anything' },
])('refuses a mismatched payload for $type.$event', (input) => {
  const schema = wirePart(input.type)?.events[input.event];

  expect(() => partEventPayload(schema, input.payload)).toThrow(
    'Invalid Plugin event payload',
  );
});

it('addresses a dispatch by node key and event name only', () => {
  const dispatch = {
    pluginId: 'hello',
    path: '/',
    viewId: 'view',
    revision: 1,
    key: 'row',
    event: 'onPress',
  };

  expect(PluginDispatchInput.parse(dispatch)).toEqual(dispatch);
  expect(
    PluginDispatchInput.safeParse({ ...dispatch, event: '' }).success,
  ).toBe(false);
});
