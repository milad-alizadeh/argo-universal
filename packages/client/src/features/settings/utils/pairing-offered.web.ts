import type { DesktopBridge } from '@repo/contracts';

declare global {
  interface Window {
    argo?: DesktopBridge;
  }
}

/*
 * The desktop shell is a web build too, and it can keep a Device Key in Electron's `safeStorage`; a browser tab has nowhere a page cannot read, so web stays Server-Device-only (ADR-0045).
 * The shell's own bridge is what tells the two apart, as the notification code reads it.
 */
export const pairingOffered = (): boolean =>
  globalThis.window?.argo !== undefined;
