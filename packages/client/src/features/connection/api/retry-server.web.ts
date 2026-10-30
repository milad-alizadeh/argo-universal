import type { DesktopBridge } from '@repo/contracts';

declare global {
  interface Window {
    argo?: DesktopBridge;
  }
}

// The web App has no bridge, so it asks nobody.
export const retryServer = (): void => {
  globalThis.window?.argo?.retryServer();
};
