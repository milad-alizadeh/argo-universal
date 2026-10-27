import { expect, it } from 'vitest';
import { kitComponent } from './kit';
import { componentEventHandler, componentEventPayload } from './wire';

it('keeps pagination and anchoring on a Plugin List', () => {
  const props = {
    anchor: 'end',
    pagination: { hasMore: true, onLoadMore: { $event: 'onLoadMore' } },
    onRefresh: { $event: 'onRefresh' },
    searchMode: 'plugin',
    onSearchTextChange: { $event: 'onSearchTextChange' },
  };

  expect(kitComponent('List')?.props.parse(props)).toMatchObject(props);
});

it('checks the nested selection event payload', () => {
  const event = kitComponent('List')?.events.onChange;
  expect(componentEventPayload(event, ['web', 'phone'])).toEqual([
    'web',
    'phone',
  ]);
  expect(
    componentEventHandler(
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
