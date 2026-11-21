import { expect, it, vi } from 'vitest';
import { DraftNamings } from './draft-namings';

it('keeps the region the Agent named for a Plugin, each naming with its own serial', () => {
  const namings = new DraftNamings();

  namings.name('issues', 'header');
  namings.name('issues', 'header');

  expect(namings.of('issues')).toEqual({ region: 'header', serial: 2 });
});

it('keeps each Plugin’s naming apart', () => {
  const namings = new DraftNamings();

  namings.name('issues', 'list');
  namings.name('home', 'card');

  expect(namings.of('issues')?.region).toBe('list');
  expect(namings.of('home')?.region).toBe('card');
  expect(namings.of('other')).toBeUndefined();
});

it('tells a listener of each naming until it unsubscribes', () => {
  const namings = new DraftNamings();
  const heard = vi.fn<() => void>();
  const stop = namings.subscribe(heard);

  namings.name('issues', 'list');
  stop();
  namings.name('issues', 'footer');

  expect(heard).toHaveBeenCalledTimes(1);
});
