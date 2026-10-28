import { vi } from 'vitest';

const animationClock = {
  toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'],
} satisfies NonNullable<Parameters<typeof vi.useFakeTimers>[0]>;

// Steps the animation clock at each browser paint, so a busy runner cannot skip the motion's middle.
export async function sampleEachFrame(
  action: () => void,
  measure: () => number,
  frames: number,
): Promise<number[]> {
  const requestPaint = requestAnimationFrame;

  vi.useFakeTimers(animationClock);

  try {
    action();

    return await collectFrames(requestPaint, measure, frames);
  } finally {
    vi.useRealTimers();
  }
}

async function collectFrames(
  requestPaint: typeof requestAnimationFrame,
  measure: () => number,
  frames: number,
): Promise<number[]> {
  const samples: number[] = [];

  for (const frame of Array.from({ length: frames }).keys()) {
    await new Promise<void>((resolve) => requestPaint(() => resolve()));
    vi.advanceTimersToNextFrame();
    samples[frame] = measure();
  }

  return samples;
}
