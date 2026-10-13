export const startLoginDeadline = (
  expired: () => void,
  milliseconds: number,
): ReturnType<typeof setTimeout> => {
  const timer = setTimeout(expired, milliseconds);
  timer.unref();

  return timer;
};
