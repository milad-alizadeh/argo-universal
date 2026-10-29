interface FrameWait {
  frame: number;
  timer: ReturnType<typeof setTimeout>;
}

/*
 * A hidden window draws no frames, so work that waited for one alone would hold still until the
 * window came back. It runs at the next frame, or after this long when no frame comes.
 */
export const noFrameMs = 100;

// Runs `run` once: at the next frame, or after noFrameMs when the window draws none. The returned function cancels it.
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
