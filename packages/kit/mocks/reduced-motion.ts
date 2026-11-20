import { cdp } from 'vitest/browser';
import { nextFrames } from '#mocks/next-frames';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

const stalledAfterMs = 10_000;

/*
 * Resolves once the page's own media query says what was asked, which can trail the DevTools reply. No deadline, as in
 * `story-layout`: a page that never agrees ends at the test's own timeout, and a warning says what it waits for.
 */
async function untilPageReports(reduced: boolean): Promise<void> {
  const stalled = setTimeout(() => {
    console.warn(
      `Still waiting for ${reducedMotionQuery} to be ${String(reduced)}.`,
    );
  }, stalledAfterMs);

  while (matchMedia(reducedMotionQuery).matches !== reduced) {
    await nextFrames();
  }

  clearTimeout(stalled);
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
