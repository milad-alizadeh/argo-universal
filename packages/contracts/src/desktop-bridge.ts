export interface DesktopBridge {
  serverUrl: string | null;
  window: {
    minimize(): void;
    maximize(): void;
    close(): void;
  };
  symbols?: {
    render(request: {
      name: string;
      pointSize: number;
    }): Promise<string | null>;
  };
}
