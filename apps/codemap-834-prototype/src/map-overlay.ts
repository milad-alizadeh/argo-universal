/*
 * What a CodeMap renderer tells the overlay laid over its canvas: the camera it fills, the labels it
 * placed and its first drawn frame. The renderer never calls up into the page; the overlay draws
 * the labels itself and tells one observer what changed.
 */
import type { RefObject } from 'react';
import { createStore, type Feed } from './feed';
import type { Insets, Label } from './map-labels';
import type { RendererInfo } from './model';
import type { Viewport } from './viewport';

export interface MapOverlay {
  /** The camera handle the mounted renderer fills; the overlay's camera controls drive it. */
  viewport: RefObject<Viewport | null>;
  /** The bands the plates over the map cover, as Code Map measures them; labels stay out. */
  insets: Feed<Insets>;
  /** Shows the labels the renderer placed for its current camera pose. */
  showLabels: (labels: Label[]) => void;
  /** Called after each drawn frame; only the first reports readiness, so `info` runs once. */
  drawn: (info: () => RendererInfo) => void;
}

export interface OverlayObserver {
  drawn: (info: RendererInfo) => void;
  labels: (count: number) => void;
}

/** The text follows the id, so id, position and width say whether a label looks the same. */
function key(labels: Label[]): string {
  return labels
    .map(({ id, x, y, maxWidth }) => `${id} ${x} ${y} ${maxWidth}`)
    .join('\n');
}

function sameLabels(current: Label[], next: Label[]): boolean {
  return current.length === next.length && key(current) === key(next);
}

function sameInsets(current: Insets, next: Insets): boolean {
  return JSON.stringify(current) === JSON.stringify(next);
}

const open: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

function once(observer: OverlayObserver): MapOverlay['drawn'] {
  let ready = false;

  return (info) => {
    if (ready) return;
    ready = true;
    observer.drawn(info());
  };
}

export interface CodeMapOverlay {
  /** Handed to the renderer. */
  overlay: MapOverlay;
  /** Read by the label layer. */
  labels: Feed<Label[]>;
  /** Records the bands Code Map measured under its plates. */
  cover: (insets: Insets) => void;
}

/** One overlay per mounted view: an empty camera handle, no labels or bands, and not yet drawn. */
export function createMapOverlay(observer: OverlayObserver): CodeMapOverlay {
  const labels = createStore<Label[]>([], sameLabels);
  const insets = createStore(open, sameInsets);

  const overlay: MapOverlay = {
    viewport: { current: null },
    insets,
    showLabels: (next) => labels.set(next) && observer.labels(next.length),
    drawn: once(observer),
  };

  const cover = (next: Insets): void => {
    insets.set(next);
  };

  return { overlay, labels, cover };
}
