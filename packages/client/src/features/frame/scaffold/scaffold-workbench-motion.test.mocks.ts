import { waitFor } from 'storybook/test';
import { vi } from 'vitest';

interface CapturedSlide {
  animation: Animation;
  startTime: Animation['startTime'];
  currentTime: Animation['currentTime'];
}

interface WorkbenchSlide {
  startTime: Animation['startTime'];
  currentTime: Animation['currentTime'];
  positions: number[];
}

// Hold the same task that creates the animation, as a heavy render does before the browser can paint.
function holdMainThread(milliseconds: number): void {
  const until = performance.now() + milliseconds;

  while (performance.now() < until) {
    // The browser cannot paint during this task.
  }
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

    const positions = Array.from({ length: 12 }, (_, index) => {
      animation.currentTime = (duration * index) / 12;

      return getComputedStyle(workbench).opacity === '0'
        ? Number.NaN
        : Math.round(workbench.getBoundingClientRect().left);
    });

    return { startTime, currentTime, positions };
  } finally {
    spy.mockRestore();
    captured?.animation.cancel();
  }
}
