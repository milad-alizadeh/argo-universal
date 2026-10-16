/*
 * What a CodeMap renderer tells the overlay laid over its canvas: the camera it fills, the labels it
 * placed and its first drawn frame. The renderer never calls up into the page; the overlay draws
 * the labels itself and tells one observer what changed.
 */
import type { RefObject } from 'react';
import type { Insets, Label } from './map-labels';
import type { RendererInfo } from './model';
import type { Viewport } from './viewport';

/** Viewport pixels the overlay's control bands cover: the toggle row above, the measure and camera plates below. */
export const overlayInsets: Insets = {
  top: 55,
  right: 0,
  bottom: 170,
  left: 0,
};

export interface MapOverlay {
  /** The camera handle the mounted renderer fills; the overlay's camera controls drive it. */
  viewport: RefObject<Viewport | null>;
  /** Labels stay out of these bands. */
  insets: Insets;
  /** Shows the labels the renderer placed for its current camera pose. */
  showLabels: (labels: Label[]) => void;
  /** Called after each drawn frame; only the first reports readiness, so `info` runs once. */
  drawn: (info: () => RendererInfo) => void;
}

/** The labels the overlay draws, readable as an external store. */
export interface LabelFeed {
  current: () => Label[];
  subscribe: (listener: () => void) => () => void;
}

export interface OverlayObserver {
  drawn: (info: RendererInfo) => void;
  labels: (count: number) => void;
}

interface State {
  labels: Label[];
  listeners: Set<() => void>;
  ready: boolean;
}

/** The text follows the id, so id, position and width say whether a label looks the same. */
function key(labels: Label[]): string {
  return labels
    .map(({ id, x, y, maxWidth }) => `${id} ${x} ${y} ${maxWidth}`)
    .join('\n');
}

function unchanged(current: Label[], next: Label[]): boolean {
  return current.length === next.length && key(current) === key(next);
}

function show(state: State, next: Label[], observer: OverlayObserver): void {
  if (unchanged(state.labels, next)) return;
  state.labels = next;
  observer.labels(next.length);

  for (const listener of state.listeners) listener();
}

function drawn(
  state: State,
  info: () => RendererInfo,
  observer: OverlayObserver,
): void {
  if (state.ready) return;
  state.ready = true;
  observer.drawn(info());
}

function feed(state: State): LabelFeed {
  return {
    current: () => state.labels,
    subscribe: (listener) => {
      state.listeners.add(listener);

      return (): void => {
        state.listeners.delete(listener);
      };
    },
  };
}

export interface CodeMapOverlay {
  /** Handed to the renderer. */
  overlay: MapOverlay;
  /** Read by the label layer. */
  labels: LabelFeed;
}

/** One overlay per mounted view: an empty camera handle, no labels, and not yet drawn. */
export function createMapOverlay(observer: OverlayObserver): CodeMapOverlay {
  const state: State = { labels: [], listeners: new Set(), ready: false };

  const overlay: MapOverlay = {
    viewport: { current: null },
    insets: overlayInsets,
    showLabels: (next) => show(state, next, observer),
    drawn: (info) => drawn(state, info, observer),
  };

  return { overlay, labels: feed(state) };
}
