import { expect, it, vi } from 'vitest';
import type { Automation } from './pull-automations';
import type { ChangesSource } from './pull-changes';
import { createPulls } from './pull-sync';

const link = { projectId: 'project', repository: 'owner/repo', number: 12 };

const automation: Automation = {
  offers: vi.fn<Automation['offers']>(),
  set: vi.fn<Automation['set']>(),
  watch: vi.fn<Automation['watch']>(),
  forget: vi.fn<Automation['forget']>(),
};

function sourceOf(): ChangesSource {
  return {
    automations: { fix: automation, archive: automation },
    store: {
      attach: vi.fn<ChangesSource['store']['attach']>(),
      attachAgain: vi.fn<ChangesSource['store']['attachAgain']>(),
      detach: vi.fn<ChangesSource['store']['detach']>(),
      detached: vi.fn<ChangesSource['store']['detached']>(),
      forSessions: async (ids) =>
        ids.map((sessionId) => ({ ...link, sessionId })),
    },
    records: {
      of: async (links) => links.map((key) => ({ link: key, pull: {} })),
      save: vi.fn<ChangesSource['records']['save']>(),
      forget: vi.fn<ChangesSource['records']['forget']>(),
    },
    reads: {
      pull: () => ({ api: 'read', name: 'pull', args: {} }),
      checks: vi.fn<ChangesSource['reads']['checks']>(),
      autoMerge: vi.fn<ChangesSource['reads']['autoMerge']>(),
      mergeSettings: vi.fn<ChangesSource['reads']['mergeSettings']>(),
      comments: vi.fn<ChangesSource['reads']['comments']>(),
      viewer: vi.fn<ChangesSource['reads']['viewer']>(),
    },
    readState: async () => ({ stale: false }),
  };
}

it('shares the record save across overlapping refreshes and reads it again later', async () => {
  const source = sourceOf();
  const saving = Promise.withResolvers<boolean>();
  const started = Promise.withResolvers<void>();

  const save = vi.spyOn(source.records, 'save').mockImplementation(() => {
    started.resolve();

    return saving.promise;
  });

  const read = vi.spyOn(source, 'readState');
  const changed = vi.fn<() => void>();
  const pulls = createPulls(source, changed);

  const first = pulls.sync(['first']);
  await started.promise;

  const second = pulls.sync(['second']);
  saving.resolve(true);
  await Promise.all([first, second]);

  expect(read).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledTimes(1);
  expect(changed).toHaveBeenCalledTimes(1);

  await pulls.sync(['second']);
  expect(read).toHaveBeenCalledTimes(2);
  expect(save).toHaveBeenCalledTimes(2);
});
