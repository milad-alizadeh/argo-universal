export interface DesktopBridge {
  serverUrl: string | null;
  window: {
    show(): void;
    minimize(): void;
    maximize(): void;
    close(): void;
    // Linux keeps a minimized window visible and focused to the page, so only the desktop app can tell.
    isMinimized(): boolean;
    // Calls the listener on each minimize and restore; returns the unsubscribe.
    onMinimizedChange(listener: (minimized: boolean) => void): () => void;
  };
  symbols?: {
    render: (request: {
      name: string;
      pointSize: number;
    }) => Promise<string | null>;
  };
}
