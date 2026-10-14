import { isDeepStrictEqual } from 'node:util';
import type { EventObject, Snapshot } from 'xstate';
import type { StatePath } from 'xstate/graph';

type ModelPath = StatePath<Snapshot<unknown>, EventObject>;

const isPrefixOf = (path: ModelPath, other: ModelPath): boolean =>
  path.steps.every((step, index) =>
    isDeepStrictEqual(step.event, other.steps[index]?.event),
  );

// TestModel retains only paths that are not prefixes of another generated path.
export const terminalPaths = <Path extends ModelPath>(
  paths: Path[],
): Path[] => {
  const ranked = [...paths].sort(
    (left, right) => right.steps.length - left.steps.length,
  );

  return ranked.filter(
    (path, index) =>
      !ranked.slice(0, index).some((other) => isPrefixOf(path, other)),
  );
};
