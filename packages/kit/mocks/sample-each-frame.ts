// Runs `action`, then reads `measure` on each of the next `frames` animation frames, so a test can follow a motion frame by frame.
export function sampleEachFrame<Sample = number>(
  action: () => void,
  measure: () => Sample,
  frames: number,
): Promise<Sample[]> {
  return new Promise((resolve) => {
    action();
    collectFrames(measure, frames, resolve);
  });
}

function collectFrames<Sample>(
  measure: () => Sample,
  frames: number,
  resolve: (samples: Sample[]) => void,
): void {
  const samples: Sample[] = [];

  const step = (): void => {
    samples.push(measure());

    if (samples.length < frames) requestAnimationFrame(step);
    else resolve(samples);
  };

  requestAnimationFrame(step);
}
