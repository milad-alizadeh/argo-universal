import { testStory } from './story-file.mts';
import { shardByWeight } from './story-render-shard.mts';

type Entry = { file: string; weight: number };
type Suite = 'interaction' | 'render';

function shards(entries: Entry[], suite: Suite, limit: number) {
  const total = Math.min(limit, entries.length);
  return Array.from({ length: total }, (_, index) => ({
    suite,
    files: shardByWeight(entries, (entry) => entry.weight, {
      index: index + 1,
      total,
    }).map((entry) => entry.file),
  }));
}

function selection(changed: string[] | undefined, list: () => string[]) {
  if (!changed) return { reason: 'Missing base or deleted path' };
  const sources = changed.filter((file) => !/^docs\/.*\.md$/.test(file));
  if (!sources.length)
    return { files: new Set<string>(), reason: 'Documentation only' };
  // One source at a time during the pilot: a match for one source cannot prove another resolved.
  if (
    sources.length !== 1 ||
    !/^packages\/(client|kit)\/(src|mocks)\/.*\.tsx?$/.test(sources[0] ?? '')
  )
    return { reason: 'Shared configuration or unverified dependencies' };
  try {
    const files = list();
    if (
      !files.length ||
      (sources[0]?.endsWith('.stories.tsx') && !files.includes(sources[0]))
    )
      return { reason: 'No confirmed story dependency' };
    return { files: new Set(files), reason: 'Affected stories' };
  } catch {
    return { reason: 'Dependency listing failed' };
  }
}

export function planStories(
  inventory: Entry[],
  changed: string[] | undefined,
  list: () => string[],
) {
  const scope = selection(changed, list);
  const selected = inventory.filter(
    (entry) => !scope.files || scope.files.has(entry.file),
  );
  const matrix = [
    ...shards(
      selected.filter((entry) => testStory.test(entry.file)),
      'interaction',
      3,
    ),
    ...shards(
      selected.filter((entry) => !testStory.test(entry.file)),
      'render',
      4,
    ),
  ];
  return {
    mode: scope.files ? 'affected' : 'full',
    reason: scope.reason,
    jobs: matrix.length,
    matrix,
  };
}
