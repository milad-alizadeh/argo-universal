/*
 * How long the Agent list waits for the Agent it was given. The Server answered in about a third of a second
 * every time it was measured; past this the wait is the Agent's own, and standing on a spinner is worse than
 * going back to a picker that fills in where it stands, which is what it did before (owner, 2026-10-21).
 */
const waitForSettings = 600;

/*
 * The shortest the spinner stands. The settings sometimes land inside a couple of frames, and a mark that
 * appears and goes again in that time reads as a glitch; the owner would rather wait than see it flash
 * (owner, 2026-10-21).
 */
const spinnerFloor = 250;

// How much longer the list holds: until the settings are in, and never less than the spinner's shortest time.
export const holdFor = (at: number, settled: boolean, now: number): number =>
  Math.max((settled ? spinnerFloor : waitForSettings) - (now - at), 0);
