import { expect, it } from 'vitest';
import { DraftComments, draftCommentsOf } from './draft-comments';

const page = { pluginId: 'tracker', path: '/issues' };

const note = {
  address: 'list/row-409',
  nodeKey: 'row-409',
  region: 'list',
  variant: 'rows',
  note: 'Use a chip',
};

it('keeps the notes of one page apart from another page of the same Plugin', () => {
  const comments = new DraftComments();

  comments.save(page, note);

  expect(comments.of(page).notes).toEqual([note]);
  expect(comments.of({ ...page, path: '/other' }).notes).toEqual([]);
});

it('replaces the note on a node a second note names, and drops it when the note is cleared', () => {
  const comments = new DraftComments();

  comments.save(page, note);
  comments.save(page, { ...note, note: 'Use a coloured chip' });
  expect(comments.of(page).notes.map(({ note: text }) => text)).toEqual([
    'Use a coloured chip',
  ]);

  comments.save(page, { ...note, note: '  ' });
  expect(comments.of(page).notes).toEqual([]);
});

it('forgets the notes once they are sent, and keeps comment mode as it was', () => {
  const comments = new DraftComments();

  comments.setCommenting(page, true);
  comments.save(page, note);
  comments.sent(page);

  expect(comments.of(page)).toEqual({ notes: [], commenting: true });
});

it('tells a listener when a page changes, and keeps one answer while nothing does', () => {
  const comments = new DraftComments();
  let heard = 0;
  const stop = comments.subscribe(() => (heard += 1));
  const before = comments.of(page);

  expect(comments.of(page)).toBe(before);
  comments.setCommenting(page, true);
  expect(heard).toBe(1);
  stop();
  comments.save(page, note);
  expect(heard).toBe(1);
});

it('sends each note by its node, region and Variant, without the address the pin needs', () => {
  expect(draftCommentsOf([note])).toEqual([
    {
      nodeKey: 'row-409',
      region: 'list',
      variant: 'rows',
      note: 'Use a chip',
    },
  ]);
  expect(
    draftCommentsOf([{ address: 'title', nodeKey: 'title', note: 'Bigger' }]),
  ).toEqual([{ nodeKey: 'title', note: 'Bigger' }]);
});
