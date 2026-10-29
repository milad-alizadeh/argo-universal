import type { Prop } from './new-story-props.mts';
import { pascal } from './story-title-rules.mts';

// A prop name to the values the component's variants maps branch on, in source order.
export type Branches = Map<string, string[]>;

export interface StoryPlan {
  title: string;
  component: string;
  importPath: string;
  kitComponent: string | undefined;
  props: Prop[];
  branches: Branches;
}

export interface StoryEntry {
  name: string;
  args: Record<string, string | boolean>;
}

function valueCounts(branches: [string, string[]][]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of branches.flatMap(([, values]) => values))
    counts.set(value, (counts.get(value) ?? 0) + 1);

  return counts;
}

const valueName = (prop: string, value: string, shared: boolean): string =>
  shared ? pascal(prop) + pascal(value) : pascal(value);

const entryFor =
  (counts: Map<string, number>) =>
  (prop: string, value: string): StoryEntry => {
    if (value === 'true') return { name: pascal(prop), args: { [prop]: true } };

    const shared = (counts.get(value) ?? 0) > 1;

    return { name: valueName(prop, value, shared), args: { [prop]: value } };
  };

// A boolean branch is named for its prop, a value branch for its value; a value two props share takes its prop's name too.
export function storyEntries(
  branches: Branches,
  declared?: Set<string>,
): StoryEntry[] {
  const kept = [...branches].filter(
    ([prop]) => declared === undefined || declared.has(prop),
  );

  const entry = entryFor(valueCounts(kept));

  return kept.flatMap(([prop, values]) =>
    values.map((value) => entry(prop, value)),
  );
}
