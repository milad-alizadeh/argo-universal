import { expect } from 'storybook/test';

const colorCanvas = document.createElement('canvas');
colorCanvas.width = colorCanvas.height = 1;

// Draws a colour to one pixel so any CSS colour syntax compares equal, without touching the page.
function pixel(color: string) {
  const context = colorCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Missing canvas context');
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return Array.from(context.getImageData(0, 0, 1, 1).data);
}

// The first opaque surface hit under the middle of a fade, skipping the scrolled content it covers.
function surfaceBehind(fade: Element) {
  const box = fade.getBoundingClientRect();
  const scroll = fade.parentElement?.querySelector(
    ':scope > :not([data-testid^="scroll-fade"])',
  );
  for (const element of document.elementsFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2,
  )) {
    if (fade.contains(element) || scroll?.contains(element)) continue;
    const color = getComputedStyle(element).backgroundColor;
    if (pixel(color)[3] === 255) return color;
  }
  throw new Error('No surface behind the fade');
}

// Every gradient stop of a scroll fade is the colour of the surface behind it; pass the surface when it ignores pointer events.
export function expectFadeColor(fade: Element, surface?: Element) {
  const surfaceColor = surface
    ? getComputedStyle(surface).backgroundColor
    : surfaceBehind(fade);
  const stops = fade.querySelectorAll('stop');
  expect(stops.length).toBe(3);
  for (const stop of stops)
    expect(pixel(stop.getAttribute('stop-color') ?? '')).toEqual(
      pixel(surfaceColor),
    );
}
