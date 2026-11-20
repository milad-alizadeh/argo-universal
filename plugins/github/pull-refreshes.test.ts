import { expect, it, vi } from 'vitest';
import type { PullInfo } from './pull-info';
import { PullRefreshes } from './pull-refreshes';

const link = { projectId: 'project', repository: 'owner/repo', number: 12 };

const sync = { kind: 'sync' } as const;

type Save = ConstructorParameters<typeof PullRefreshes>[0];

it('shares one save and notification across overlapping refreshes', async () => {
  const saving = Promise.withResolvers<boolean>();
  const save = vi.fn<Save>().mockReturnValue(saving.promise);
  const changed = vi.fn<() => void>();
  const refreshes = new PullRefreshes(save, changed);

  const overlap = Promise.all([
    refreshes.run([link], sync),
    refreshes.run([link], sync),
  ]);

  saving.resolve(true);
  await overlap;

  expect(save).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenCalledTimes(1);
});

it('starts another save after the previous refresh finishes', async () => {
  const save = vi.fn<Save>().mockResolvedValue(false);
  const refreshes = new PullRefreshes(save, () => {});
  await refreshes.run([link], sync);
  save.mockClear();

  await refreshes.run([link], sync);

  expect(save).toHaveBeenCalledTimes(1);
});

const validated: PullInfo = {
  repository: link.repository,
  number: link.number,
  title: 'Updated pull request',
  url: 'https://github.com/owner/repo/pull/12',
  stage: 'open',
  head: 'new-head',
  branch: 'feature',
  base: 'main',
  draft: false,
  conflict: false,
  files: 0,
  additions: 0,
  deletions: 0,
};

it('saves the validated Attach answer after an older in-flight refresh', async () => {
  const saving = Promise.withResolvers<boolean>();

  const save = vi
    .fn<Save>()
    .mockReturnValueOnce(saving.promise)
    .mockResolvedValue(true);

  const refreshes = new PullRefreshes(save, () => {});
  const earlier = refreshes.run([link], sync);

  const attached = refreshes.run([link], {
    kind: 'sync',
    validated: { link, data: validated },
  });

  saving.resolve(false);
  await Promise.all([earlier, attached]);

  expect(save.mock.calls).toEqual([
    [link, undefined],
    [link, validated],
  ]);
});

it('announces saved records even when a sibling save fails', async () => {
  const save = vi
    .fn<Save>()
    .mockResolvedValueOnce(true)
    .mockRejectedValue(new Error('save failed'));

  const changed = vi.fn<() => void>();
  const refreshes = new PullRefreshes(save, changed);

  await expect(
    refreshes.run([link, { ...link, number: 13 }], sync),
  ).rejects.toThrow('save failed');

  expect(changed).toHaveBeenCalledTimes(1);
});

it('reads again for a Slot ask that arrives while an earlier read is in flight', async () => {
  const first = Promise.withResolvers<boolean>();

  const save = vi
    .fn<Save>()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue(true);

  const refreshes = new PullRefreshes(save, () => {});
  const slot = { kind: 'slot' } as const;

  const asks = Promise.all([
    refreshes.run([link], slot),
    refreshes.run([link], slot),
    refreshes.run([link], slot),
  ]);

  first.resolve(false);
  await asks;

  expect(save).toHaveBeenCalledTimes(2);
});
