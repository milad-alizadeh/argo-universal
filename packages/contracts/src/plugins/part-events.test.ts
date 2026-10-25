import { expect, it } from 'vitest';
import { wirePart } from './kit';
import { partEventPayload } from './wire';

it.each([
  { type: 'Button', event: 'onPress', payload: undefined },
  { type: 'FieldGroup.TextField', event: 'onChangeText', payload: 'draft' },
  { type: 'FieldGroup.Toggle', event: 'onValueChange', payload: true },
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
  { type: 'FieldGroup.TextField', event: 'onChangeText', payload: 42 },
  { type: 'FieldGroup.Toggle', event: 'onValueChange', payload: 'enabled' },
  { type: 'List.Section', event: 'onSelectionChange', payload: ['a', 42] },
  { type: 'Button', event: 'invented', payload: 'anything' },
])('refuses a mismatched payload for $type.$event', (input) => {
  const schema = wirePart(input.type)?.events[input.event];

  expect(() => partEventPayload(schema, input.payload)).toThrow(
    'Invalid Plugin event payload',
  );
});
