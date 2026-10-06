import { expect } from 'storybook/test';

// The first opaque surface under the middle of a fade, skipping the scrolled content it covers.
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
    if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
  }
  throw new Error('No surface behind the fade');
}

// Every gradient stop of a scroll fade is the colour actually showing behind it.
export function expectFadeColor(fade: Element) {
  const surfaceColor = surfaceBehind(fade);
  const stops = fade.querySelectorAll('stop');
  expect(stops.length).toBe(3);
  const probe = document.createElement('div');
  document.body.append(probe);
  try {
    for (const stop of stops) {
      probe.style.color = stop.getAttribute('stop-color') ?? '';
      expect(getComputedStyle(probe).color).toBe(surfaceColor);
    }
  } finally {
    probe.remove();
  }
}
