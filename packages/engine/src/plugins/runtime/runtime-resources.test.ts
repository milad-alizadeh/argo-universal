import { expect, it, vi } from 'vitest';
import { address, caller, pluginId, Rig } from '#mocks/runtime-resources-rig';
import { changeWindowMs } from '../pages/change-window';

// An open page that drew the Plugin's overview once.
async function opened(): Promise<Rig> {
  const open = new Rig();
  const first = open.drawn();

  await open.answer(1);
  await first;

  return open;
}

it('sends no Stale mark and reads nothing after a read-tier Operation run', async () => {
  const open = await opened();

  await open.ran('read');
  await open.drawn();

  expect(open.windows).toBe(0);
  expect(open.reads()).toHaveLength(1);
  expect(open.marks).toEqual([]);
});

it('redraws nothing when an act-tier Operation, such as a Turn-end github.discover, leaves every answer as it was', async () => {
  const open = await opened();

  await open.ran('act');
  open.elapse();
  await vi.waitFor(() => expect(open.reads()).toHaveLength(2));
  await open.answer(1);

  await vi.waitFor(() => expect(open.windows).toBe(0));
  expect(open.marks).toEqual([]);
});

it('marks only the addresses whose answer differs, and once for five Sessions finishing Turns in one window', async () => {
  const open = await opened();

  for (let session = 0; session < 5; session += 1) {
    open.resources.changes.changed(caller);
    await open.ran('act');
  }

  expect(open.windows).toBe(1);
  open.elapse();
  await vi.waitFor(() => expect(open.reads()).toHaveLength(2));
  await open.answer(2);

  await vi.waitFor(() => expect(open.marks).toEqual([[address]]));
  expect(changeWindowMs).toBeGreaterThan(0);
});

it('marks every page, as before, when a new worker of the Plugin runs', async () => {
  const open = await opened();

  open.resources.running(pluginId, 2);

  expect(open.marks).toEqual(['all']);
});

it('marks, with each change, an address whose draw read no Query, and none that a Query answered the same', async () => {
  const open = await opened();
  const plain = open.drawnPlain('/plain');

  await open.ran('act');

  expect(open.marks).toEqual([[plain]]);

  open.elapse();
  await vi.waitFor(() => expect(open.reads()).toHaveLength(2));
  await open.answer(1);
  await vi.waitFor(() => expect(open.windows).toBe(0));
  expect(open.marks).toEqual([[plain]]);
});

it('marks every page when a change comes before the Server has drawn any of the Plugin', () => {
  const open = new Rig();

  open.resources.changes.changed(caller);

  expect(open.marks).toEqual(['all']);
});
