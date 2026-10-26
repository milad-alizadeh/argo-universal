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
