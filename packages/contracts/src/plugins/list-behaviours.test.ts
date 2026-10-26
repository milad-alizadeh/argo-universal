import { expect, it } from 'vitest';
import { wirePart } from './kit';
import { partEventHandler, partEventPayload } from './wire';

it('keeps pagination and anchoring on a Plugin List', () => {
  const props = {
    anchor: 'end',
    pagination: { hasMore: true, onLoadMore: { $event: 'onLoadMore' } },
    onRefresh: { $event: 'onRefresh' },
    searchMode: 'plugin',
    onSearchTextChange: { $event: 'onSearchTextChange' },
  };

  expect(wirePart('List')?.props.parse(props)).toMatchObject(props);
});

it('checks the nested selection event payload', () => {
  const event = wirePart('List')?.events.onChange;
  expect(partEventPayload(event, ['web', 'phone'])).toEqual(['web', 'phone']);
  expect(
    partEventHandler(
      {
        selection: {
          mode: 'multiple',
          selected: [],
          onChange: { $event: 'onChange' },
        },
      },
      'onChange',
      event,
    ),
  ).toEqual({ $event: 'onChange' });
});
