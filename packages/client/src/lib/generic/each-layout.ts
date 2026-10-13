import { Uniwind } from 'uniwind';
import { settleViewport } from './settle-viewport';

// Reads a width token from tooling/uniwind/theme.css off the page, so tests never copy it.
function tokenWidth(name: string): number {
  const token = getComputedStyle(document.documentElement).getPropertyValue(
    name,
  );
  const width = Number.parseFloat(token);
  if (Number.isNaN(width)) throw new Error(`The ${name} token is missing.`);
  return width;
}

export function wideBreakpoint(): number {
  return tokenWidth('--breakpoint-wide');
}

export function contentWideMin(): number {
  return tokenWidth('--container-content-wide');
}

// Tablet sits between the phone and wide layouts, like an iPad in portrait.
export const layoutWidths = { phone: 390, tablet: 1024, wide: 1440 } as const;

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
  await settleViewport(wide ? layoutWidths.wide : layoutWidths.phone);
  for (const mode of ['light', 'dark'] as const) {
    Uniwind.setTheme(mode);
    await assertion(wide);
  }
}
