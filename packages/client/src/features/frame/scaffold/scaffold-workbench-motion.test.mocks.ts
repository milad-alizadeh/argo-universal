import { waitFor } from 'storybook/test';
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

interface CapturedSlide {
  animation: Animation;
  startTime: Animation['startTime'];
  currentTime: Animation['currentTime'];
}

interface WorkbenchSlide {
  startTime: Animation['startTime'];
  currentTime: Animation['currentTime'];
  positions: number[];
  backdropSafe: boolean;
}

// Hold the same task that creates the animation, as a heavy render does before the browser can paint.
function holdMainThread(milliseconds: number): void {
  const until = performance.now() + milliseconds;

  while (performance.now() < until) {
    // The browser cannot paint during this task.
  }
}

function preservesGlassBackdrop(workbench: HTMLElement): boolean {
  const glass = [...workbench.querySelectorAll('div')].find(
    (part) => getComputedStyle(part).backdropFilter !== 'none',
  );

  if (!glass) throw new Error('The Workbench needs a backdrop-filter surface.');

  for (
    let ancestor = glass.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    if (Number(getComputedStyle(ancestor).opacity) < 1) return false;
  }

  return true;
}

// Pause the real element animation before sampling it so a slow runner cannot skip its middle.
export async function sampleWorkbenchSlide(
  workbench: HTMLElement,
  action: () => void,
  busy: number,
): Promise<WorkbenchSlide> {
  const animate = workbench.animate.bind(workbench);
  let captured: CapturedSlide | undefined;

  const spy = vi
    .spyOn(workbench, 'animate')
    .mockImplementation((frames, timing) => {
      const animation = animate(frames, timing);
      holdMainThread(busy);

      const { startTime, currentTime } = animation;
      animation.pause();

      captured = { animation, startTime, currentTime };

      return animation;
    });

  try {
    action();

    const { animation, startTime, currentTime } = await waitFor(() => {
      if (!captured) throw new Error('The Workbench did not start a slide.');

      return captured;
    });

    const duration = animation.effect?.getComputedTiming().endTime;

    if (typeof duration !== 'number' || duration <= 0) {
      throw new Error('The Workbench slide needs a positive duration.');
    }

    let backdropSafe = true;

    const positions = Array.from({ length: 12 }, (_, index) => {
      animation.currentTime = (duration * index) / 12;
      backdropSafe = preservesGlassBackdrop(workbench) && backdropSafe;

      return getComputedStyle(workbench).opacity === '0'
        ? Number.NaN
        : Math.round(workbench.getBoundingClientRect().left);
    });

    return { startTime, currentTime, positions, backdropSafe };
  } finally {
    spy.mockRestore();
    captured?.animation.cancel();
  }
}
