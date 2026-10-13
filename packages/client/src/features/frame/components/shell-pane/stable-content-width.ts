import { useState } from 'react';

export function stableContentWidth(
  contentWidth: number | undefined,
  width: number,
  lastWidth: number,
): number {
  return contentWidth ?? (width > 0 ? width : lastWidth);
}

export function useStableContentWidth(
  width: number,
  contentWidth: number | undefined,
): number {
  const [lastWidth, setLastWidth] = useState(contentWidth ?? width);
  const stableWidth = stableContentWidth(contentWidth, width, lastWidth);
  if (lastWidth !== stableWidth) setLastWidth(stableWidth);
  return stableWidth;
}
