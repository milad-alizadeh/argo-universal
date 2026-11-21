import { vi } from 'vitest';

const animationClock = {
  toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'],
} satisfies NonNullable<Parameters<typeof vi.useFakeTimers>[0]>;

// Steps the animation clock at each browser paint, so a busy runner cannot skip the motion's middle.
export async function sampleMotionFrames(
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

// Holds the main thread, as a heavy pane's first render does in the same task as the press that opened it.
function holdMainThread(milliseconds: number): void {
  const until = performance.now() + milliseconds;

  while (performance.now() < until) {
    // Busy: nothing paints until the commit's work ends.
  }
}

// Samples on the real clock after a press whose commit keeps the main thread busy, so a motion that started its clock inside the commit has spent it before its first frame.
export async function sampleBusyMotionFrames(
  action: () => void,
  measure: () => number,
  { frames, busy }: { frames: number; busy: number },
): Promise<number[]> {
  action();
  holdMainThread(busy);

  const samples: number[] = [];

  for (const frame of Array.from({ length: frames }).keys()) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    samples[frame] = measure();
  }

  return samples;
}
