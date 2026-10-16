export interface DesktopBridge {
  serverUrl: string | null;
  window: {
    show(): void;
    minimize(): void;
    maximize(): void;
    close(): void;
  };
  symbols?: {
    render: (request: {
      name: string;
      pointSize: number;
    }) => Promise<string | null>;
  };
}
