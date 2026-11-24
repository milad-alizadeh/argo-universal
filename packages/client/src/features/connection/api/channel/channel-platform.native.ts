import { requireNativeModule } from 'expo';
import { getRandomBytes } from 'expo-crypto';
import { Platform } from 'react-native';
import type { ChannelPlatform } from './channel-transport';
import { loadDeviceKey } from './device-key-store.native';
import { NativeChannel, type ChannelNative } from './native-channel';
import { openWebSocketCarrier } from './web-socket-carrier';

type NativeModule = Omit<ChannelNative, 'subscribe'> & {
  addListener: (
    name: 'channel',
    listener: Parameters<ChannelNative['subscribe']>[0],
  ) => { remove: () => void };
};

const module = requireNativeModule<NativeModule>('ArgoChannel');

const native: ChannelNative = {
  open: (url, timeoutMs) => module.open(url, timeoutMs),
  listen: (id) => module.listen(id),
  write: (id, base64) => module.write(id, base64),
  handOver: (id, handOver) => module.handOver(id, handOver),
  send: (id, message) => module.send(id, message),
  close: (id, code, reason) => module.close(id, code, reason),
  subscribe: (listener) => {
    const subscription = module.addListener('channel', listener);

    return (): void => subscription.remove();
  },
};

/*
 * The App's sockets on iOS and Android: the channel inside a WebSocket at the Server's URL, as a phone reaches an Expo dev server (ADR-0045). The Device Key sits in the Keychain or Keystore.
 */
export const appChannelPlatform: ChannelPlatform = {
  openSocket: openWebSocketCarrier,
  // tRPC's socket runs in the native module (`ArgoChannel`); fetch, for Blobs and Plugin assets, keeps the carrier above.
  nativeChannel: new NativeChannel(native),
  randomBytes: getRandomBytes,
  deviceKey: loadDeviceKey,
  // A Device says only what it is; the Ticket belongs to the one Connection that spends it.
  claim: () => ({
    name: Platform.OS === 'ios' ? 'iPhone' : 'Android phone',
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  }),
};
