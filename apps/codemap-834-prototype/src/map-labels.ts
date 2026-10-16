/*
 * One label placement for both CodeMap views. It takes plain numbers only, never a live camera, so a
 * stale matrix cannot misplace a label. Each view supplies its anchor rule; everything else is here.
 */
import type { Tile } from './model';
import type { ScreenPoint, Size } from './viewport';

export interface Label {
  id: string;
  text: string;
  /** The label's top-left corner in viewport pixels. */
  x: number;
  y: number;
  maxWidth: number;
}

/** Viewport pixels on each side that an overlay reserves; no label anchor lands inside them. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LabelScreen {
  size: Size;
  insets: Insets;
}

/** The per-view rule for where a tile's label sits under one camera pose. */
export interface LabelAnchors {
  /** The label's corner on screen, or none when the tile is too small to read there. */
  anchor: (tile: Tile) => ScreenPoint | undefined;
  /** Whether the anchor can be seen. Asked only for a tile with an anchor. */
  exposed: (tile: Tile) => boolean;
  /** How many anchored, exposed tiles the view considers, largest first; the rest go unlabelled. */
  candidates: number;
}

export const maximumLabels = 32;

const maximumWidth = 200;

const characterWidth = 7;

const labelPadding = 16;

const rowSeparation = 24;

const columnSeparation = 210;

const byArea = new WeakMap<Tile[], Tile[]>();

/** Largest first, sorted once per tile list. */
function ordered(tiles: Tile[]): Tile[] {
  const cached = byArea.get(tiles);

  if (cached) return cached;
  const sorted = [...tiles].sort((a, b) => b.area - a.area);
  byArea.set(tiles, sorted);

  return sorted;
}

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function horizontal(label: Label, screen: LabelScreen): boolean {
  const extent = Math.min(
    label.maxWidth,
    label.text.length * characterWidth + labelPadding,
  );

  const right = screen.size.width - screen.insets.right;

  return label.x >= screen.insets.left && label.x + extent <= right;
}

function vertical(label: Label, screen: LabelScreen): boolean {
  const bottom = screen.size.height - screen.insets.bottom;

  return label.y >= screen.insets.top && label.y <= bottom;
}

function overlaps(a: Label, b: Label): boolean {
  return (
    Math.abs(a.y - b.y) < rowSeparation &&
    Math.abs(a.x - b.x) < columnSeparation
  );
}

function free(label: Label, placed: Label[], screen: LabelScreen): boolean {
  if (!horizontal(label, screen) || !vertical(label, screen)) return false;

  return !placed.some((other) => overlaps(label, other));
}

function candidate(tile: Tile, anchors: LabelAnchors): Label | undefined {
  const point = anchors.anchor(tile);

  if (!point) return;

  return {
    id: tile.id,
    text: fileName(tile.path),
    ...point,
    maxWidth: maximumWidth,
  };
}

interface Placement {
  anchors: LabelAnchors;
  screen: LabelScreen;
  placed: Label[];
  considered: number;
}

function consider(tile: Tile, ctx: Placement): Label | undefined {
  const label = candidate(tile, ctx.anchors);

  if (!label || !ctx.anchors.exposed(tile)) return;
  ctx.considered += 1;

  return label;
}

function place(tile: Tile, ctx: Placement): void {
  const label = consider(tile, ctx);

  if (label && free(label, ctx.placed, ctx.screen)) ctx.placed.push(label);
}

function done(ctx: Placement): boolean {
  return (
    ctx.placed.length >= maximumLabels ||
    ctx.considered >= ctx.anchors.candidates
  );
}

/**
 * Places at most 32 labels, largest file first, from the tiles the view considers. A label is
 * placed when its anchor is readable and exposed, it fits on screen outside the insets, and it
 * overlaps no larger file's label.
 */
export function placeLabels(
  tiles: Tile[],
  anchors: LabelAnchors,
  screen: LabelScreen,
): Label[] {
  const ctx: Placement = { anchors, screen, placed: [], considered: 0 };

  for (const tile of ordered(tiles)) {
    place(tile, ctx);

    if (done(ctx)) break;
  }

  return ctx.placed;
}
