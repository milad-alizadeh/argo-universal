// Two frames: one for the layout a change asks for, one for whatever follows it, such as a popper re-anchoring.
export function nextFrames(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
