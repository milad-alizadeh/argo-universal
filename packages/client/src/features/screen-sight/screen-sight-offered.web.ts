// Only the desktop App's preload makes this a desktop App; a browser tab has no way to capture, so it offers no switch.
export const screenSightOffered = (): boolean =>
  typeof globalThis.window?.argo?.links?.onOpen === 'function';
