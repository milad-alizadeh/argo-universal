import type * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, View } from 'react-native';
import { type ClampLeaf, useLineHeight } from './clamp-leaves';
import { type MeasuredLeaf, wholeLineCut } from './whole-line-cut';

type ContentView = React.ComponentRef<typeof View>;

function measureLeaf(
  leaf: ClampLeaf,
  content: ContentView,
): Promise<MeasuredLeaf | null> {
  return new Promise((resolve) => {
    leaf.node.measureLayout(
      content,
      (...[, y = 0, , height = 0]: number[]) =>
        resolve({ y, height, lineHeight: leaf.lineHeight }),
      () => resolve(null),
    );
  });
}

function isMeasured(leaf: MeasuredLeaf | null): leaf is MeasuredLeaf {
  return leaf !== null;
}

export interface WholeLineClamp {
  registerLeaf: (leaf: ClampLeaf) => () => void;
  content: React.RefObject<ContentView | null>;
  onContentLayout: (event: LayoutChangeEvent) => void;
  // Where to cut the markdown, or undefined when it fits within the lines.
  clipHeight: number | undefined;
}

// Clamps markdown to at most `lines` body lines, cutting after the last line or block that fits whole.
export function useWholeLineClamp(lines: number): WholeLineClamp {
  const lineHeight = useLineHeight('body');
  const limit = lineHeight === undefined ? undefined : lineHeight * lines;
  const leaves = useRef(new Set<ClampLeaf>());
  const content = useRef<ContentView>(null);
  const [fullHeight, setFullHeight] = useState(0);
  const [cut, setCut] = useState<number>();
  const registerLeaf = useCallback((leaf: ClampLeaf): (() => void) => {
    leaves.current.add(leaf);
    return () => {
      leaves.current.delete(leaf);
    };
  }, []);
  const onContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setFullHeight(event.nativeEvent.layout.height);
      const view = content.current;
      if (!view || limit === undefined) return;
      void Promise.all(
        [...leaves.current].map((leaf) => measureLeaf(leaf, view)),
      ).then((measured) =>
        setCut(wholeLineCut(measured.filter(isMeasured), limit)),
      );
    },
    [limit],
  );
  const overflows = limit !== undefined && fullHeight > limit + 1;
  return {
    registerLeaf,
    content,
    onContentLayout,
    clipHeight: overflows ? (cut ?? limit) : undefined,
  };
}
