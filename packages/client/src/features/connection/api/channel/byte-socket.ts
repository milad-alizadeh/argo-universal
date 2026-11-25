export interface ChannelAddress {
  readonly host: string;
  readonly port: number;
}

/*
 * A socket as the channel needs it, and nothing more: bytes in order. The App and its tests open one as a WebSocket at the Server's channel path, which carries the channel over anything that carries HTTP (ADR-0045).
 */
export interface ByteSocket {
  write: (data: Uint8Array) => void;
  close: () => void;
  // Set once, before the first byte can arrive.
  onData: (chunk: Uint8Array) => void;
  onClose: (error?: Error) => void;
}

// Headers for the WebSocket upgrade, which only the native module can set; a browser's WebSocket cannot, and the JavaScript carrier sends none.
export type UpgradeHeaders = Readonly<Record<string, string>>;

export type OpenSocket = (
  address: ChannelAddress,
  headers?: UpgradeHeaders,
) => Promise<ByteSocket>;
