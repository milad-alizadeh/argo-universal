import type { Label } from './model';

const maximumLabels = 32;

const maximumWidth = 200;

const characterWidth = 7;

const labelPadding = 16;

const headerHeight = 55;

const footerHeight = 170;

const rowSeparation = 24;

const columnSeparation = 210;

interface Viewport {
  width: number;
  height: number;
}

function horizontal(label: Label, width: number): boolean {
  const extent = Math.min(
    maximumWidth,
    label.text.length * characterWidth + labelPadding,
  );

  return label.x >= 0 && label.x + extent <= width;
}

function vertical(label: Label, height: number): boolean {
  return label.y >= headerHeight && label.y <= height - footerHeight;
}

function overlap(a: Label, b: Label): boolean {
  return (
    Math.abs(a.y - b.y) < rowSeparation &&
    Math.abs(a.x - b.x) < columnSeparation
  );
}

function visible(label: Label, viewport: Viewport): boolean {
  return horizontal(label, viewport.width) && vertical(label, viewport.height);
}

function available(label: Label, placed: Label[], viewport: Viewport): boolean {
  if (placed.length >= maximumLabels) return false;

  return (
    visible(label, viewport) && !placed.some((other) => overlap(label, other))
  );
}

function place(label: Label, placed: Label[], viewport: Viewport): boolean {
  if (available(label, placed, viewport)) placed.push(label);

  return placed.length >= maximumLabels;
}

export function cullLabels(
  candidates: Label[],
  width: number,
  height: number,
): Label[] {
  const placed: Label[] = [];

  for (const label of candidates) {
    if (place(label, placed, { width, height })) break;
  }

  return placed;
}
