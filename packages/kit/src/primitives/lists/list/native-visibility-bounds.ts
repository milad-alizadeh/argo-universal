// Native host refs expose these DOM-compatible methods on the installed React Native.
export interface ViewportNode {
  readonly parentElement: ViewportNode | null;
  readonly tagName: string;
  getBoundingClientRect: () => Bounds;
}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type BoundsCache = Map<ViewportNode, Bounds>;

export function nativeNodeVisible(
  node: ViewportNode,
  window: Bounds,
  cache: BoundsCache,
): boolean {
  const target = nodeBounds(node, cache);
  const viewport = enclosingViewport(node.parentElement, window, cache);

  return overlaps(target, viewport);
}

function enclosingViewport(
  node: ViewportNode | null,
  bounds: Bounds,
  cache: BoundsCache,
): Bounds {
  if (!node) return bounds;

  const clipped = node.tagName.endsWith('ScrollView')
    ? intersection(bounds, nodeBounds(node, cache))
    : bounds;

  return enclosingViewport(node.parentElement, clipped, cache);
}

function nodeBounds(node: ViewportNode, cache: BoundsCache): Bounds {
  const cached = cache.get(node);

  if (cached) return cached;
  const bounds = node.getBoundingClientRect();

  cache.set(node, bounds);

  return bounds;
}

function intersection(first: Bounds, second: Bounds): Bounds {
  return {
    left: Math.max(first.left, second.left),
    top: Math.max(first.top, second.top),
    right: Math.min(first.right, second.right),
    bottom: Math.min(first.bottom, second.bottom),
  };
}

function overlaps(first: Bounds, second: Bounds): boolean {
  const bounds = intersection(first, second);

  return bounds.right > bounds.left && bounds.bottom > bounds.top;
}
