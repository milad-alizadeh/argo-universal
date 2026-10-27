import { expect, it } from 'vitest';
import { kitComponent } from './kit';
import { componentEventPayload } from './wire';

it.each([
  { type: 'Button', event: 'onPress', payload: undefined },
  { type: 'FieldGroup.TextField', event: 'onChangeText', payload: 'draft' },
  { type: 'FieldGroup.Toggle', event: 'onValueChange', payload: true },
  { type: 'List.Section', event: 'onSelectionChange', payload: ['alpha'] },
  { type: 'Sheet', event: 'onOpenChange', payload: false },
])(
  'checks $type.$event against the kit component schema',
  ({ type, event, payload }) => {
    const schema = kitComponent(type)?.events[event];

    expect(componentEventPayload(schema, payload)).toEqual(payload);
  },
);

it.each([
  { type: 'Button', event: 'onPress', payload: 'unexpected' },
  { type: 'FieldGroup.TextField', event: 'onChangeText', payload: 42 },
  { type: 'FieldGroup.Toggle', event: 'onValueChange', payload: 'enabled' },
  { type: 'List.Section', event: 'onSelectionChange', payload: ['a', 42] },
  { type: 'Button', event: 'invented', payload: 'anything' },
])('refuses a mismatched payload for $type.$event', (input) => {
  const schema = kitComponent(input.type)?.events[input.event];

  expect(() => componentEventPayload(schema, input.payload)).toThrow(
    'Invalid Plugin event payload',
  );
});
