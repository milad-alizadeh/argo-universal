// Runs `action`, then reads `measure` on each of the next `frames` animation frames, so a test can follow a motion frame by frame.
export function sampleEachFrame(
  action: () => void,
  measure: () => number,
  frames: number,
): Promise<number[]> {
  return new Promise((resolve) => {
    const samples: number[] = [];
    const step = (): void => {
      samples.push(measure());
      if (samples.length < frames) requestAnimationFrame(step);
      else resolve(samples);
    };
    action();
    requestAnimationFrame(step);
  });
}
