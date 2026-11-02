export interface ChannelAddress {
  readonly host: string;
  readonly port: number;
}

/*
 * A TCP socket as the channel needs it, and nothing more. The App opens one with `react-native-tcp-socket`; a test opens one with `node:net`. Either way what crosses it is bytes, with no HTTP stack in between, which is what an Android release build lets reach a local-network address (ADR-0045).
 */
export interface ByteSocket {
  write: (data: Uint8Array) => void;
  close: () => void;
  // Set once, before the first byte can arrive.
  onData: (chunk: Uint8Array) => void;
  onClose: (error?: Error) => void;
}

export type OpenSocket = (address: ChannelAddress) => Promise<ByteSocket>;
