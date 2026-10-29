// Runs `step` on a later frame, returning what cancels it.
export type Schedule = (step: () => void) => () => void;

// The next animation frame: every frame a List's drag and moves wait on.
export const nextFrame: Schedule = (step) => {
  const frame = requestAnimationFrame(step);

  return (): void => cancelAnimationFrame(frame);
};
