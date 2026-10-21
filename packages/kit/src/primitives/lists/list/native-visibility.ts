import {
  nativeNodeVisible,
  type Bounds,
  type BoundsCache,
  type ViewportNode,
} from './native-visibility-bounds';

interface Observation {
  node: ViewportNode;
  window: Bounds;
  report: (visible: boolean) => void;
  visible?: boolean;
}

const observations = new Set<Observation>();

let pending: number | undefined;

// One frame poll shares ancestor measurements across every native shelf.
export function observeNativeVisibility(observation: Observation): () => void {
  observations.add(observation);
  schedule();

  return () => {
    observations.delete(observation);

    if (observations.size === 0) stop();
  };
}

function schedule(): void {
  if (pending === undefined) pending = requestAnimationFrame(update);
}

function stop(): void {
  if (pending !== undefined) cancelAnimationFrame(pending);
  pending = undefined;
}

function update(): void {
  pending = undefined;
  const cache: BoundsCache = new Map();

  for (const observation of observations) reportVisibility(observation, cache);

  if (observations.size > 0) schedule();
}

function reportVisibility(observation: Observation, cache: BoundsCache): void {
  const visible = nativeNodeVisible(
    observation.node,
    observation.window,
    cache,
  );

  if (visible === observation.visible) return;
  observation.visible = visible;
  observation.report(visible);
}
