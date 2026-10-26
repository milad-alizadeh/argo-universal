import { expect, it } from 'vitest';
import { pageItems, pageWindow } from './page-items';

it('starts at the first item with the default limit when the input gives none', () => {
  expect(pageWindow({}, 50)).toEqual({ cursor: 0, limit: 50 });
});

it('keeps the cursor and limit the input gives', () => {
  expect(pageWindow({ cursor: 4, limit: 2 }, 50)).toEqual({
    cursor: 4,
    limit: 2,
  });
});

it('points the next cursor past the page while items remain', () => {
  expect(pageItems([1, 2, 3, 4, 5], { cursor: 1, limit: 2 })).toEqual({
    items: [2, 3],
    nextCursor: 3,
  });
});

it('has no next cursor once the last item is in the page', () => {
  expect(pageItems([1, 2, 3], { cursor: 1, limit: 2 })).toEqual({
    items: [2, 3],
    nextCursor: null,
  });
});
