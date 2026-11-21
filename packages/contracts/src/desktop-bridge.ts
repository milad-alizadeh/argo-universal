import type { DesktopShare } from './desktop-share';
import type { ScreenCaptureAnswer } from './operations';

export interface DesktopBridge {
  serverUrl: string | null;
  // Native directory selection only; the Server still registers the Project. Cancel returns null.
  chooseProjectFolder?: () => Promise<string | null>;
  share?: (content: DesktopShare) => Promise<void>;
  // Asks the desktop App to make sure a Supervisor runs, because a Server it started can be gone rather than out of reach.
  retryServer: () => void;
  window: {
    getZoomFactor?(): number;
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
  // One still picture of the main display for screen sight: the desktop App owns the capture and says why when it cannot.
  screen?: {
    capture(): Promise<ScreenCaptureAnswer>;
    // Tells the desktop App whether this Device turned screen sight on; it refuses every capture until told yes.
    setEnabled(enabled: boolean): void;
  };
  symbols?: {
    render: (request: {
      name: string;
      pointSize: number;
    }) => Promise<string | null>;
  };
}
