import {
  KitDrawingSelectionContext,
  type KitDrawingHit,
  type KitDrawingSelection,
} from '@repo/kit/wrapped-component';
import { useContext, useLayoutEffect, useRef, useState } from 'react';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { boxless } from './boxless';
import {
  boxOf,
  DraftCommentingContext,
  DraftPlaceContext,
  type Box,
  type DraftCommenting,
  type DraftPlace,
  type NodeIdentity,
} from './draft-commenting';

type Holder = React.ComponentRef<typeof View>;

const nowhere: Box = { x: 0, y: 0, width: -1, height: -1 };

// The kit components whose own view fills the room its parent leaves, so their wrapper must too where it keeps a box.
export const filling = new Set([
  'Screen',
  'Sheet.Screen',
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
    (child) =>
      !child.hasAttribute('data-draft-comment-address') &&
      getComputedStyle(child).position !== 'fixed',
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

function useOutsidePick(
  ref: React.RefObject<Holder | null>,
  address: string,
  commenting: DraftCommenting | null,
): KitDrawingSelection | null {
  useLayoutEffect(() => {
    const element = ref.current;

    if (!commenting || Platform.OS !== 'web' || !(element instanceof Element))
      return;

    const pick = (event: Event): void => {
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key))
        return;

      if (!(event.target instanceof Element)) return;

      if (event.target.closest('[data-kit-drawing-selection]')) return;

      const target = event.target.closest('[data-draft-comment-node]');

      if (target !== element || !commenting.pickOutside(element, address))
        return;

      event.preventDefault();
      event.stopPropagation();
    };

    element.addEventListener('click', pick, true);
    element.addEventListener('keydown', pick, true);

    return (): void => {
      element.removeEventListener('click', pick, true);
      element.removeEventListener('keydown', pick, true);
    };
  }, [ref, address, commenting]);

  if (!commenting || Platform.OS !== 'web') return null;

  return (schedule): boolean => {
    const element = ref.current;

    return (
      element instanceof Element &&
      commenting.pickOutside(element, address, schedule)
    );
  };
}

function CommentFocus(props: {
  identity: NodeIdentity;
  place: DraftPlace | null;
  onFocusChange: (focused: boolean) => void;
}): React.JSX.Element {
  const { identity, place, onFocusChange } = props;
  const label = [place?.label, identity.nodeKey].filter(Boolean).join(' · ');

  return (
    <View
      role="button"
      aria-label={`Comment on ${label}`}
      {...{ dataSet: { draftCommentAddress: identity.address } }}
      tabIndex={0}
      className="sr-only"
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
    />
  );
}

const drawingAddress = (
  active: DraftCommenting | null,
  address: string,
): { dataSet?: { draftCommentNode: string } } =>
  active && Platform.OS === 'web'
    ? { dataSet: { draftCommentNode: address } }
    : {};

interface CommentTargetProps {
  identity: NodeIdentity;
  fills: boolean;
  hit?: KitDrawingHit;
  children: React.ReactNode;
}

/*
 * A view the App can find on screen and mark while the author comments, around a node of a dev Plugin's Draft page. A
 * node keeps it whether or not the author is commenting, so entering and leaving comment mode redraws nothing and
 * loses no scroll or input.
 */
export function CommentTarget({
  identity,
  fills,
  hit,
  children,
}: CommentTargetProps): React.JSX.Element {
  const commenting = useContext(DraftCommentingContext);
  const active = commenting?.active ? commenting : null;
  const place = useContext(DraftPlaceContext);
  const ref = useRef<Holder>(null);
  const [focused, setFocused] = useState(false);

  const measure = (done: (box: Box) => void): void =>
    measureBox(ref.current, done);

  const text = (): string => firstLine(ref.current);

  useLayoutEffect(
    () => active?.register({ ...identity, place, measure, text, hit }),
    // The measure reads the ref, which never changes.
    [active, identity, place, hit],
  );

  const select = useOutsidePick(ref, identity.address, active);

  return (
    <View
      ref={ref}
      {...drawingAddress(active, identity.address)}
      style={boxless}
      className={fills ? 'min-h-0 min-w-0 flex-1' : 'relative min-w-0 shrink'}
    >
      <KitDrawingSelectionContext value={select}>
        {children}
      </KitDrawingSelectionContext>
      {active && Platform.OS === 'web' && (
        <CommentFocus
          identity={identity}
          place={place}
          onFocusChange={setFocused}
        />
      )}
      {commenting && (
        <commenting.Mark
          address={identity.address}
          place={place}
          measure={measure}
          focused={Boolean(active) && focused}
        />
      )}
    </View>
  );
}
