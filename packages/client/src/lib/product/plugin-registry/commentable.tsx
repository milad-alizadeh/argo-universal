import { useContext, useLayoutEffect, useRef } from 'react';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { boxless } from './boxless';
import {
  boxOf,
  DraftCommentingContext,
  DraftPlaceContext,
  type Box,
  type NodeIdentity,
} from './draft-commenting';

type Holder = React.ComponentRef<typeof View>;

const nowhere: Box = { x: 0, y: 0, width: -1, height: -1 };

// The kit components whose own view fills the room its parent leaves, so their wrapper must too where it keeps a box.
export const filling = new Set([
  'Screen',
  'ListDetail',
  'Detail',
  'List',
  'ScrollView',
  'Board',
]);

// The corner of the node's first child, which a node of several children shares with the rest; 0 where it is square.
function cornerOf(nodes: readonly Element[]): number {
  const [first] = nodes;

  return first
    ? Number.parseFloat(getComputedStyle(first).borderTopLeftRadius) || 0
    : 0;
}

// A boxless wrapper has no size, so its box is its children's. The marks the App lays over the node are fixed and are no part of it; counting them grew the box a frame at a time.
function webBox(view: Holder | null): Box {
  if (!(view instanceof Element)) return nowhere;

  const nodes = [...view.children].filter(
    (child) => getComputedStyle(child).position !== 'fixed',
  );

  const rects = nodes.map((child) => child.getBoundingClientRect());

  if (rects.length === 0) return nowhere;

  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));

  return {
    x: left,
    y: top,
    width: Math.max(...rects.map((rect) => rect.right)) - left,
    height: Math.max(...rects.map((rect) => rect.bottom)) - top,
    radius: cornerOf(nodes),
  };
}

// What the node shows on its first line: the web reads it off the page; native has no such reader.
function firstLine(view: Holder | null): string {
  if (Platform.OS !== 'web' || !(view instanceof Element)) return '';

  const shown = view.firstElementChild;

  if (!(shown instanceof HTMLElement)) return '';

  return shown.innerText.split('\n').find((line) => line.trim() !== '') ?? '';
}

function measureBox(view: Holder | null, done: (box: Box) => void): void {
  if (!view) return done(nowhere);

  if (Platform.OS === 'web') return done(webBox(view));

  view.measureInWindow((...rect) => done(boxOf(rect)));
}

/*
 * A view the App can find on screen and mark while the author comments, around a node of a dev Plugin's Draft page. A
 * node keeps it whether or not the author is commenting, so entering and leaving comment mode redraws nothing and
 * loses no scroll or input.
 */
export function CommentTarget({
  identity,
  fills,
  children,
}: {
  identity: NodeIdentity;
  fills: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const commenting = useContext(DraftCommentingContext);
  const place = useContext(DraftPlaceContext);
  const ref = useRef<Holder>(null);
  const { address, nodeKey } = identity;

  const measure = (done: (box: Box) => void): void =>
    measureBox(ref.current, done);

  const text = (): string => firstLine(ref.current);

  useLayoutEffect(
    () => commenting?.register({ address, nodeKey, place, measure, text }),
    // The measure reads the ref, which never changes.
    [commenting, address, nodeKey, place],
  );

  return (
    <View
      ref={ref}
      style={boxless}
      className={fills ? 'min-h-0 min-w-0 flex-1' : 'relative min-w-0 shrink'}
    >
      {children}
      {commenting && (
        <commenting.Mark address={address} place={place} measure={measure} />
      )}
    </View>
  );
}
