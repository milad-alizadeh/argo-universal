import { Uniwind } from 'uniwind';
import { settleViewport } from './settle-viewport';

export const layoutWidths = { phone: 390, wide: 1440 } as const;

// Runs the assertion at phone and wide widths, in light and dark; outside the browser runner, once at the default size.
export async function eachLayout(
  assertion: (wide: boolean) => Promise<void>,
): Promise<void> {
  if (!('__vitest_browser__' in globalThis)) {
    await assertion(false);
    return;
  }
  try {
    for (const wide of [false, true]) {
      await settleViewport(wide ? layoutWidths.wide : layoutWidths.phone);
      for (const mode of ['light', 'dark'] as const) {
        Uniwind.setTheme(mode);
        await assertion(wide);
      }
    }
  } finally {
    Uniwind.setTheme('light');
  }
}
