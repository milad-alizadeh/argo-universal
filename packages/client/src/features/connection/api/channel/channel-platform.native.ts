import { getRandomBytes } from 'expo-crypto';
import { Platform } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import type { ByteSocket } from './byte-socket';
import type { ChannelPlatform } from './channel-transport';
import { loadDeviceKey } from './device-key-store.native';

// A string `data` event only happens when an encoding was set, and none is; bytes are all the channel reads.
const asBytes = (data: Uint8Array | string): Uint8Array =>
  typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);

function adapter(
  socket: ReturnType<typeof TcpSocket.createConnection>,
): ByteSocket {
  const bytes: ByteSocket = {
    write: (data) => void socket.write(data),
    close: () => void socket.destroy(),
    onData: () => {},
    onClose: () => {},
  };

  socket.on('data', (data) => bytes.onData(asBytes(data)));
  socket.on('close', () => bytes.onClose());
  socket.on('error', (error) => bytes.onClose(error));

  return bytes;
}

/*
 * The App's sockets on iOS and Android: a raw TCP socket, because a release Android build refuses `ws://` and `http://` to a local-network address and lets a socket through (#1488, ADR-0045). The Device Key sits in the Keychain or Keystore.
 */
export const appChannelPlatform: ChannelPlatform = {
  openSocket: (address) =>
    new Promise((resolve, reject) => {
      const socket = TcpSocket.createConnection(
        { host: address.host, port: address.port },
        () => resolve(adapter(socket)),
      );

      socket.once('error', reject);
    }),
  randomBytes: getRandomBytes,
  deviceKey: loadDeviceKey,
  // After pairing a Device says only what it is; the ticket belongs to the one Connection that spends it (#1496).
  claim: () => ({
    name: Platform.OS === 'ios' ? 'iPhone' : 'Android phone',
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  }),
};
