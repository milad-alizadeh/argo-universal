// The switch only works where the desktop App's preload can hear it: a browser tab has no `screen` bridge, so it offers none.
export const screenSightOffered = (): boolean =>
  typeof globalThis.window?.argo?.screen?.setEnabled === 'function';
