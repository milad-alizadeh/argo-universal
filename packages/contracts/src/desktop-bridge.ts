import type { DesktopShare } from './desktop-share';

export interface DesktopBridge {
  serverUrl: string | null;
  share?: (content: DesktopShare) => Promise<void>;
  // Asks the desktop App to make sure a Supervisor runs, because a Server it started can be gone rather than out of reach.
  retryServer: () => void;
  window: {
    show(): void;
    minimize(): void;
    maximize(): void;
    close(): void;
    // The window's own colour, shown where the page has not painted; as sRGB hex.
    setBackgroundColor(color: string): void;
    // Linux keeps a minimized window visible and focused to the page, so only the desktop app can tell.
    isMinimized(): boolean;
    // Calls the listener on each minimize and restore; returns the unsubscribe.
    onMinimizedChange(listener: (minimized: boolean) => void): () => void;
  };
  // Screen links the system opens in this app (`argo://`), which the desktop app has already checked for shape.
  links: {
    // Calls the listener with each link, the ones that arrived before the page could listen first; returns the unsubscribe.
    onOpen(listener: (link: string) => void): () => void;
  };
  symbols?: {
    render: (request: {
      name: string;
      pointSize: number;
    }) => Promise<string | null>;
  };
}
