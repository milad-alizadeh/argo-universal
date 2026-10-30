import type * as React from 'react';
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { TextLayoutEvent, ViewInstance } from 'react-native';
import { type TextRole, useTextStyle } from '#primitives/content/text';

type MeasurableNode = Pick<ViewInstance, 'measureLayout'>;

// A drawn piece of markdown a clamp may cut below; text also gives its line height, as drawn.
export interface ClampLeaf {
  node: MeasurableNode;
  lineHeight?: number;
}

export interface ClampLeafRegistry {
  register: (leaf: ClampLeaf) => () => void;
  // A body line is drawn this tall, which the clamp's limit counts its lines in.
  bodyLineDrawn: (height: number) => void;
}

// Supplied by a clamped message, so its markdown reports where each line and block ends.
export const ClampLeaves = createContext<ClampLeafRegistry | undefined>(
  undefined,
);

// The web resolves a line height as a pixel string, native as a number.
export function useLineHeight(role: TextRole): number | undefined {
  const lineHeight = Number.parseFloat(String(useTextStyle(role).lineHeight));

  return Number.isFinite(lineHeight) ? lineHeight : undefined;
}

type LeafRef = (node: MeasurableNode | null) => (() => void) | undefined;

// A block a clamp cuts below as a whole.
export function useClampLeaf(): LeafRef {
  const registry = useContext(ClampLeaves);

  return useCallback(
    (node) => {
      if (!node || !registry) return;

      return registry.register({ node });
    },
    [registry],
  );
}

interface ClampText {
  ref: LeafRef;
  onTextLayout: (event: TextLayoutEvent) => void;
}

type LeafSlot = React.RefObject<ClampLeaf | null>;

interface Binding {
  registry: ClampLeafRegistry | undefined;
  slot: LeafSlot;
  // The height the text drew, kept apart from the style's, which a narrower or wider layout changes.
  drawn: React.RefObject<number | null>;
}

function heightOf(
  drawn: Binding['drawn'],
  styled: number | undefined,
): number | undefined {
  return drawn.current ?? styled;
}

// A leaf registered again keeps the height its text drew, which a layout that did not change would not report anew.
function registerLeaf(
  { registry, slot, drawn }: Binding,
  node: MeasurableNode | null,
  styled: number | undefined,
): (() => void) | undefined {
  if (!node || !registry) return;
  const leaf: ClampLeaf = { node, lineHeight: heightOf(drawn, styled) };

  slot.current = leaf;

  return registry.register(leaf);
}

function setDrawn(
  { slot, drawn }: Pick<Binding, 'slot' | 'drawn'>,
  height: number,
): void {
  drawn.current = height;

  if (slot.current) slot.current.lineHeight = height;
}

function shortestLine(
  lines: readonly { height: number }[],
): number | undefined {
  return lines.length === 0
    ? undefined
    : Math.min(...lines.map((line) => line.height));
}

function reportBodyLine(
  registry: ClampLeafRegistry | undefined,
  role: TextRole,
  drawn: number,
): void {
  if (role === 'body') registry?.bodyLineDrawn(drawn);
}

interface BoundLeaf {
  ref: LeafRef;
  slot: LeafSlot;
  drawn: Binding['drawn'];
}

function useLeafRef(lineHeight: number | undefined): BoundLeaf {
  const registry = useContext(ClampLeaves);
  const slot = useRef<ClampLeaf>(null);
  const drawn = useRef<number | null>(null);

  const ref = useCallback<LeafRef>(
    (node) => registerLeaf({ registry, slot, drawn }, node, lineHeight),
    [registry, lineHeight],
  );

  return { ref, slot, drawn };
}

function useDrawnLine(
  bound: Pick<Binding, 'slot' | 'drawn'>,
  role: TextRole,
): ClampText['onTextLayout'] {
  const registry = useContext(ClampLeaves);

  return useCallback(
    ({ nativeEvent }: TextLayoutEvent): void => {
      // The shortest line: a first line with a taller glyph in it would otherwise stretch the limit.
      const drawn = shortestLine(nativeEvent.lines);

      if (drawn === undefined) return;

      setDrawn(bound, drawn);
      reportBodyLine(registry, role, drawn);
    },
    [registry, bound, role],
  );
}

/*
 * Text a clamp cuts between the lines of. The style's line height is what the web draws; native scales it by the system font size,
 * and Android does so by a curve rather than a factor, so native text says what its first line drew.
 */
export function useClampText(role: TextRole): ClampText {
  const { ref, slot, drawn } = useLeafRef(useLineHeight(role));
  const bound = useMemo(() => ({ slot, drawn }), [slot, drawn]);

  return { ref, onTextLayout: useDrawnLine(bound, role) };
}
