import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, View } from 'react-native';
import {
  type ClampLeaf,
  type ClampLeafRegistry,
  useLineHeight,
} from './clamp-leaves';
import { type MeasuredLeaf, wholeLineCut } from './whole-line-cut';

type ContentView = React.ComponentRef<typeof View>;

function measureLeaf(
  leaf: ClampLeaf,
  content: ContentView,
): Promise<MeasuredLeaf | null> {
  return new Promise((resolve) => {
    leaf.node.measureLayout(
      content,
      // measureLayout reports the leaf's left, top, width and height.
      (...[_left, top = 0, _width, height = 0]: number[]) =>
        resolve({ y: top, height, lineHeight: leaf.lineHeight }),
      () => resolve(null),
    );
  });
}

function isMeasured(leaf: MeasuredLeaf | null): leaf is MeasuredLeaf {
  return leaf !== null;
}

// Where to cut content that runs past the limit: after the last line or block that fits whole.
async function measuredCut(
  leaves: Iterable<ClampLeaf>,
  content: ContentView,
  limit: number,
): Promise<number | undefined> {
  const measured = await Promise.all(
    [...leaves].map((leaf) => measureLeaf(leaf, content)),
  );

  return wholeLineCut(measured.filter(isMeasured), limit);
}

export interface WholeLineClamp {
  leafRegistry: ClampLeafRegistry;
  content: React.RefObject<ContentView | null>;
  onContentLayout: (event: LayoutChangeEvent) => void;
  // Where to cut the markdown, or undefined when it fits within the lines.
  clipHeight: number | undefined;
}

// The limit, when content of this height runs past it.
function passedLimit(
  height: number,
  limit: number | undefined,
): number | undefined {
  return limit !== undefined && height > limit + 1 ? limit : undefined;
}

type ClipOnLayout = Pick<WholeLineClamp, 'onContentLayout' | 'clipHeight'>;

type Leaves = React.RefObject<Set<ClampLeaf>>;

type Content = React.RefObject<ContentView | null>;

interface MeasuredContent {
  leaves: Leaves;
  content: Content;
  height: number;
}

interface CutMeasure extends Omit<MeasuredContent, 'height'> {
  passed: number | undefined;
  onCut: (cut: number) => void;
}

// Starts measuring the cut and returns how to drop it once the content or limit changes again.
function measureCut(measure: CutMeasure): (() => void) | undefined {
  const { passed, onCut } = measure;
  const view = measure.content.current;

  if (passed === undefined || !view) return;
  let latest = true;
  void measuredCut(measure.leaves.current, view, passed).then((measured) => {
    if (latest) onCut(measured ?? passed);
  });

  return (): void => {
    latest = false;
  };
}

// Measures the cut whenever the content or the limit changes; a cut measured for an earlier one is dropped.
function useMeasuredCut(
  passed: number | undefined,
  { leaves, content, height }: MeasuredContent,
): number | undefined {
  const [cut, setCut] = useState<number>();
  useEffect(
    () => measureCut({ passed, leaves, content, onCut: setCut }),
    [passed, height, leaves, content],
  );

  return cut;
}

function useLayoutHeight(): [number, (event: LayoutChangeEvent) => void] {
  const [height, setHeight] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setHeight(event.nativeEvent.layout.height);
  }, []);

  return [height, onLayout];
}

// Content that runs past the limit draws in full until its cut is measured, then clips to it in one step.
function useClipOnLayout(
  limit: number | undefined,
  leaves: Leaves,
  content: Content,
): ClipOnLayout {
  const [height, onContentLayout] = useLayoutHeight();
  const passed = passedLimit(height, limit);
  const cut = useMeasuredCut(passed, { leaves, content, height });

  return {
    onContentLayout,
    clipHeight: passed === undefined ? undefined : cut,
  };
}

function addLeaf(leaves: Leaves, leaf: ClampLeaf): () => void {
  leaves.current.add(leaf);

  return () => {
    leaves.current.delete(leaf);
  };
}

function useLeafRegistry(
  leaves: Leaves,
  bodyLineDrawn: (height: number) => void,
): ClampLeafRegistry {
  return useMemo(
    () => ({ register: (leaf) => addLeaf(leaves, leaf), bodyLineDrawn }),
    [leaves, bodyLineDrawn],
  );
}

// Clamps markdown to at most `lines` body lines, cutting after the last line or block that fits whole.
export function useWholeLineClamp(lines: number | undefined): WholeLineClamp {
  const styled = useLineHeight('body');
  const [drawn, setDrawn] = useState<number>();
  const leaves = useRef(new Set<ClampLeaf>());
  const content = useRef<ContentView>(null);
  const limit = clampLimit(drawn ?? styled, lines);
  const clip = useClipOnLayout(limit, leaves, content);

  return { leafRegistry: useLeafRegistry(leaves, setDrawn), content, ...clip };
}

function clampLimit(
  lineHeight: number | undefined,
  lines: number | undefined,
): number | undefined {
  return lineHeight === undefined || lines === undefined
    ? undefined
    : lineHeight * lines;
}
