/* Public paint contract: a compact plain menu has inset fill and a clear exterior. */
import { expect } from 'vitest';
import { page } from 'vitest/browser';
import {
  viewportPixels,
  type ViewportPixels,
} from './story-render-fingerprint.ts';

const CLEARANCE = 12;

const BACKGROUND_INSET = 20;

const FILL_INSET = 5;

type Rectangle = readonly [number, number, number, number];

const rectanglePoints = ([left, top, right, bottom]: Rectangle): [
  number,
  number,
][] => {
  const points: [number, number][] = [];

  for (let y = top; y < bottom; y += 1)
    for (let x = left; x < right; x += 1) points.push([x, y]);

  return points;
};

const exteriorRectangles = (box: DOMRect): Rectangle[] => {
  /* Exclude edge pixels partially covered by fractional layout and rounded-edge antialiasing. */
  const left = Math.floor(box.left);
  const top = Math.floor(box.top);
  const right = Math.ceil(box.right);
  const bottom = Math.ceil(box.bottom);

  return [
    [left - CLEARANCE, top - CLEARANCE, right + CLEARANCE, top],
    [left - CLEARANCE, bottom, right + CLEARANCE, bottom + CLEARANCE],
    [left - CLEARANCE, top, left, bottom],
    [right, top, right + CLEARANCE, bottom],
  ];
};

const expectClearExterior = (
  pixels: ViewportPixels,
  box: DOMRect,
  background: string,
): void => {
  for (const [x, y] of exteriorRectangles(box).flatMap(rectanglePoints))
    expect(
      pixels.at(x, y),
      `Compact Mode has exterior paint at ${x - box.left},${y - box.top}`,
    ).toBe(background);
};

export const auditCompactMenuPaint = async (): Promise<void> => {
  const button = page
    .getByRole('button', { name: 'Mode', exact: true })
    .element();

  const box = button.getBoundingClientRect();
  const pixels = await viewportPixels();
  const middle = box.top + box.height / 2;
  const background = pixels.at(box.left - BACKGROUND_INSET, middle);

  /* The inset is empty of text and inside the rounded control; the exterior ring is clear. */
  expect(
    pixels.at(box.left + FILL_INSET, middle),
    'Compact Mode needs visible inset fill',
  ).not.toBe(background);
  expectClearExterior(pixels, box, background);
};
