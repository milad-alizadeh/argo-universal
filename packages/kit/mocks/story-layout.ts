import { Uniwind } from 'uniwind';
import { page } from 'vitest/browser';
import { nextFrames } from '#mocks/next-frames';

// The one story-test driver for the viewport: a named layout, the breakpoints behind it, and waiting for the page to settle. It imports the browser runner, so it lives with the kit's test mocks, and tools/check-test-only-imports.mts keeps shipped code from reaching it. Tablet sits between the phone and wide layouts, like an iPad in portrait.
export const layoutWidths = { phone: 390, tablet: 1024, wide: 1440 } as const;

export type LayoutName = keyof typeof layoutWidths;

const viewportHeight = 844;

// Sizes the viewport to a named layout, or to an exact width, and waits for fonts and two frames.
export async function settleLayout(
  layout: LayoutName | number,
  height = viewportHeight,
): Promise<void> {
  const width = typeof layout === 'number' ? layout : layoutWidths[layout];

  await page.viewport(width, height);
  await document.fonts.ready;
  await nextFrames();
}

// Reads a width token from tooling/uniwind/theme.css off the page, so tests never copy it.
function tokenWidth(name: string): number {
  const token = getComputedStyle(document.documentElement).getPropertyValue(
    name,
  );

  const width = Number.parseFloat(token);

  if (Number.isNaN(width)) throw new Error(`The ${name} token is missing.`);

  return width;
}

export function mediumBreakpoint(): number {
  return tokenWidth('--breakpoint-medium');
}

export function wideBreakpoint(): number {
  return tokenWidth('--breakpoint-wide');
}

export function contentWideMin(): number {
  return tokenWidth('--container-content-wide');
}

type LayoutAssertion = (wide: boolean) => Promise<void>;

// Runs the assertion at phone and wide widths, in light and dark; outside the browser runner, once at the default size.
export async function eachLayout(assertion: LayoutAssertion): Promise<void> {
  if (!('__vitest_browser__' in globalThis)) {
    await assertion(false);

    return;
  }

  try {
    for (const wide of [false, true]) await eachMode(assertion, wide);
  } finally {
    Uniwind.setTheme('light');
  }
}

async function eachMode(
  assertion: LayoutAssertion,
  wide: boolean,
): Promise<void> {
  await settleLayout(wide ? 'wide' : 'phone');

  for (const mode of ['light', 'dark'] as const) {
    Uniwind.setTheme(mode);
    await assertion(wide);
  }
}
