const pending = new Set<number>();

export function pendingFrames(): number {
  return pending.size;
}

function countingRequest(
  request: typeof window.requestAnimationFrame,
): typeof window.requestAnimationFrame {
  return (callback: FrameRequestCallback): number => {
    const id = request((time: number): void => {
      pending.delete(id);
      callback(time);
    });

    pending.add(id);

    return id;
  };
}

function countingCancel(
  cancel: typeof window.cancelAnimationFrame,
): typeof window.cancelAnimationFrame {
  return (id: number | null | undefined): void => {
    pending.delete(Number(id));
    cancel(id);
  };
}

// Counts the frames asked for and not yet delivered, so a loop that outlives its story shows at the next one.
export function trackFrames(): void {
  window.requestAnimationFrame = countingRequest(
    window.requestAnimationFrame.bind(window),
  );
  window.cancelAnimationFrame = countingCancel(
    window.cancelAnimationFrame.bind(window),
  );
}
