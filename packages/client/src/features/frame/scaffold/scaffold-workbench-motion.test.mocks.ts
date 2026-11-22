import { expect, waitFor } from 'storybook/test';
import { vi } from 'vitest';

const animationClock = {
  toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'],
} satisfies NonNullable<Parameters<typeof vi.useFakeTimers>[0]>;

// Step the JavaScript clock as the alternate Session settles, in case it starts a JavaScript animation.
export async function sampleMotionFrames(
  action: () => void,
  measure: () => number,
  frames: number,
): Promise<number[]> {
  const requestPaint = requestAnimationFrame;

  vi.useFakeTimers(animationClock);

  try {
    action();

    return await collectFrames(measure, frames, {
      requestPaint,
      step: () => vi.advanceTimersToNextFrame(),
    });
  } finally {
    vi.useRealTimers();
  }
}

// How a sample waits for the browser's paint, and what it advances after it.
interface Paint {
  requestPaint: typeof requestAnimationFrame;
  step: () => void;
}

async function collectFrames(
  measure: () => number,
  frames: number,
  { requestPaint, step }: Paint,
): Promise<number[]> {
  const samples: number[] = [];

  for (const frame of Array.from({ length: frames }).keys()) {
    await new Promise<void>((resolve) => requestPaint(() => resolve()));
    step();
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

function motionPositions(
  animation: Animation,
  measure: () => number,
): number[] {
  const duration = animation.effect?.getComputedTiming().duration;

  if (
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration <= 0
  )
    throw new Error('The Workbench animation must have a finite duration');

  const intervals = 23;

  return Array.from({ length: intervals + 1 }, (_, index) => {
    animation.currentTime = (duration * index) / intervals;

    return measure();
  });
}

type SlideSample = { measure: () => number; commitWorkMs?: number };

// Freeze the browser animation when the commit creates it, then measure the real element at controlled times.
export async function sampleWorkbenchSlide(
  workbench: HTMLElement,
  action: () => void,
  { measure, commitWorkMs = 0 }: SlideSample,
): Promise<number[]> {
  const start = workbench.animate.bind(workbench);
  let motion: Animation | undefined;

  const animate = vi
    .spyOn(workbench, 'animate')
    .mockImplementation((frames, timing) => {
      const animation = start(frames, timing);

      if (commitWorkMs > 0) holdMainThread(commitWorkMs);
      animation.pause();
      motion = animation;

      return animation;
    });

  try {
    action();

    const animation = await waitFor(() => {
      if (!motion)
        throw new Error('The Workbench did not start a browser animation');

      return motion;
    });

    await expect(animation.currentTime).toBe(0);

    return motionPositions(animation, measure);
  } finally {
    animate.mockRestore();
    motion?.cancel();
  }
}
