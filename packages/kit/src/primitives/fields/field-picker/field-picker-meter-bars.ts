// How many bars a level glyph draws.
const barCount = 8;

export const meterBars = Array.from({ length: barCount }, (_, bar) => bar);

// How many bars a level from 0 to 1 lights, to the nearest bar; a level outside that range lights none or all.
export const litBars = (level: number): number =>
  Math.min(barCount, Math.max(0, Math.round(level * barCount)));
