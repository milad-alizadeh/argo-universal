import { cdp } from 'vitest/browser';

const query = '(prefers-reduced-motion: reduce)';

// Resolves once the page's own media query says what was asked, which can trail the DevTools reply.
async function untilPageReports(reduced: boolean): Promise<void> {
  while (matchMedia(query).matches !== reduced) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function emulate(reduced: boolean): Promise<void> {
  await cdp().send('Emulation.setEmulatedMedia', {
    features: reduced
      ? [{ name: 'prefers-reduced-motion', value: 'reduce' }]
      : [],
  });
  await untilPageReports(reduced);
}

/*
 * The browser prefers reduced motion for one story, and no longer once it ends: use as `beforeEach: reduceMotion`.
 * Reanimated reads the preference once, when its module loads, so the next story file in the same page
 * would load with it still on if this returned before the page saw it end, and its sweeps and glints would not draw.
 */
export async function reduceMotion(): Promise<() => Promise<void>> {
  await emulate(true);

  return () => emulate(false);
}
