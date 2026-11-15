import type { OpenPage } from './open-page';
import type { PluginTest } from './test-types';

type Pace = { stepMs: number; steps: number };

// What stepping the clock needs: a move, and a wait for the Plugin calls a move set off.
type Stepping = {
  advance: (ms: number) => Promise<void>;
  idle: () => Promise<void>;
};

// Moves the clock a step at a time until `done` holds, looking only once each step's Plugin calls have finished.
async function stepUntil(
  { advance, idle }: Stepping,
  done: () => boolean | Promise<boolean>,
  { stepMs, steps }: Pace,
): Promise<boolean> {
  for (let step = 0; step < steps; step += 1) {
    await idle();

    if (await done()) return true;

    await advance(stepMs);
  }

  await idle();

  return done();
}

// The test's clock: its move, and the stepped wait built on it.
export const steppedClock = (stepping: Stepping): PluginTest['clock'] => ({
  advance: stepping.advance,
  until: (done, pace) => stepUntil(stepping, done, pace),
});

// Moves the Plugin's clock until the page, drawn again after each step, shows the text; says whether it did.
export const clockUntilShown = (
  test: PluginTest,
  page: OpenPage,
  { text, ...pace }: Pace & { text: string },
): Promise<boolean> =>
  test.clock.until(async () => {
    await page.draw();

    return page.findText(text) !== undefined;
  }, pace);
