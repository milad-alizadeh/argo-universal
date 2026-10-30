interface FrameWait {
  frame: number;
  timer: ReturnType<typeof setTimeout>;
}

// A hidden window draws no frames, so work waits this long at most.
export const noFrameMs = 100;

// Runs `run` once, at the next frame or after noFrameMs; returns its cancel.
export function waitForFrame(run: () => void): () => void {
  const wait: FrameWait = {
    frame: requestAnimationFrame(() => {
      clearTimeout(wait.timer);
      run();
    }),
    timer: setTimeout(() => {
      cancelAnimationFrame(wait.frame);
      run();
    }, noFrameMs),
  };

  return () => stopWaiting(wait);
}

function stopWaiting({ frame, timer }: FrameWait): void {
  cancelAnimationFrame(frame);
  clearTimeout(timer);
}
