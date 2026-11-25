import { expect, it } from 'vitest';
import { feedEventId, syncPointOfEventId } from './subscribe';

it('reads the sync point an event id names', () => {
  expect(syncPointOfEventId(feedEventId({ epoch: 3, revision: 12 }))).toEqual({
    epoch: 3,
    revision: 12,
  });
});

it.each(['1:', ':2', ':', '', '1', '1:2:3', 'a:b'])(
  'does not read %j as a sync point, so an id with a missing part is not epoch or revision 0',
  (id) => {
    expect(syncPointOfEventId(id)).toBeNull();
  },
);
