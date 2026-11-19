import type { Merge } from './pace-metrics';

type Milestone = Pick<Merge, 'title' | 'number' | 'merged'>;

export type Lane = { name: string; first: Milestone; last: Milestone };

const areas = [
  { name: 'Workbench', pattern: /\bworkbench\b/i },
  { name: 'Pairing', pattern: /\bpair(?:ing|ed)?\b/i },
  { name: 'Composer', pattern: /\bcomposer\b/i },
  { name: 'Inspector', pattern: /\binspector\b/i },
  { name: 'Feed', pattern: /\bfeed\b/i },
];

const maxLanes = 2;

const namedArea = (title: string): string | undefined =>
  areas.find((area) => area.pattern.test(title))?.name;

function topic(title: string): string | undefined {
  const match = /^[\w-]+\(([^)]+)\)!?:/.exec(title);

  return match?.[1] ?? namedArea(title);
}

function pair(name: string, first: Merge, last: Merge): Lane[] {
  return first === last ? [] : [{ name, first, last }];
}

function bounds(name: string, rows: Merge[]): Lane[] {
  const first = rows.at(-1);
  const last = rows[0];

  if (!first || !last) return [];

  return pair(name, first, last);
}

function group(groups: Map<string, Merge[]>, pr: Merge): void {
  const name = topic(pr.title);

  if (!name) return;
  const rows = groups.get(name) ?? [];
  rows.push(pr);
  groups.set(name, rows);
}

// Merges arrive newest first. Compare PRs whose titles identify the same area.
export function milestones(merges: Merge[]): Lane[] {
  const groups = new Map<string, Merge[]>();

  for (const pr of merges) group(groups, pr);
  const lanes = [...groups].flatMap(([name, rows]) => bounds(name, rows));

  return lanes.sort((a, b) => b.last.merged - a.last.merged).slice(0, maxLanes);
}
