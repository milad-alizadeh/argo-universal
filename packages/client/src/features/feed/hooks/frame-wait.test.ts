import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { noFrameMs, waitForFrame } from './frame-wait';

const frameMs = 16;

// A window that draws: a frame comes every frameMs. A hidden one: frames never come.
function drawFrames(drawing: boolean): void {
  vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) =>
    drawing ? setTimeout(() => run(0), frameMs) : 0,
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('waitForFrame', () => {
  it('runs once, at the next frame, in a window that draws', () => {
    drawFrames(true);
    const run = vi.fn<() => void>();
    waitForFrame(run);

    vi.advanceTimersByTime(frameMs);
    expect(run).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(noFrameMs);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs once without a frame in a hidden window', () => {
    drawFrames(false);
    const run = vi.fn<() => void>();
    waitForFrame(run);

    vi.advanceTimersByTime(noFrameMs - 1);
    expect(run).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('runs nothing once cancelled', () => {
    drawFrames(true);
    const run = vi.fn<() => void>();
    waitForFrame(run)();

    vi.advanceTimersByTime(noFrameMs);
    expect(run).not.toHaveBeenCalled();
  });
});
