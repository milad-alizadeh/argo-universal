// One rounded bar the Skeleton draws where a text line, icon, image or control was, in the wrapper's pixels.
export interface SkeletonPlaceholder {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

export interface SkeletonMeasure {
  placeholders: SkeletonPlaceholder[];
  // Elements whose text turns transparent.
  ink: Element[];
  // Elements that hide with their whole subtree.
  hidden: Element[];
}

// A placeholder is its box: two that share one are drawn once.
export const placeholderKey = (placeholder: SkeletonPlaceholder): string =>
  `${placeholder.left},${placeholder.top},${placeholder.width},${placeholder.height}`;
