import { Uniwind } from 'uniwind';
import { page } from 'vitest/browser';
import { nextFrames } from '#mocks/next-frames';

// The one story-test driver for the viewport: a named layout, the breakpoints behind it, and waiting for the page to settle. It imports the browser runner, so it lives with the kit's test mocks, and tools/check-test-only-imports.mts keeps shipped code from reaching it. Tablet sits between the phone and wide layouts, like an iPad in portrait.
export const layoutWidths = { phone: 390, tablet: 1024, wide: 1440 } as const;

export type LayoutName = keyof typeof layoutWidths;

const viewportHeight = 844;

/*
 * `page.viewport` resolves once the runner has been told the size, not once the story's frame has it, so a loaded
 * machine can run on at the old width and switch layouts mid-play. Waits for the frame to be the width it was asked for.
 * There is no deadline, since a slow machine is not a failure; a frame that never takes the width, such as a runner that
 * scales it, ends at the test's own timeout, so a warning says what is being waited for while it waits.
 */
const stalledAfterMs = 10_000;

// Reports and keeps waiting: it fails nothing, so a run that is only slow still passes. Returns what cancels it.
function warnWhenStalled(width: number): () => void {
  const timer = setTimeout(() => {
    console.warn(
      `Still waiting for window.innerWidth to be ${width}px; it is ${window.innerWidth}px.`,
    );
  }, stalledAfterMs);

  return () => clearTimeout(timer);
}

async function viewportApplied(width: number): Promise<void> {
  if (window.innerWidth === width) return;

  await new Promise<void>((resolve) => {
    const cancelWarning = warnWhenStalled(width);

    const onResize = (): void => {
      if (window.innerWidth !== width) return;

      window.removeEventListener('resize', onResize);
      cancelWarning();
      resolve();
    };

    window.addEventListener('resize', onResize);
  });
}

// Sizes the viewport to a named layout, or to an exact width, and waits for the frame to take it, then for fonts and two frames.
export async function settleLayout(
  layout: LayoutName | number,
  height = viewportHeight,
): Promise<void> {
  const width = typeof layout === 'number' ? layout : layoutWidths[layout];

  await page.viewport(width, height);
  await viewportApplied(width);
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

export function columnWidth(): number {
  return tokenWidth('--container-column');
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
