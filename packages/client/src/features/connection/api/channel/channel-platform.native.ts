import { getRandomBytes } from 'expo-crypto';
import { Platform } from 'react-native';
import type { ChannelPlatform } from './channel-transport';
import { loadDeviceKey } from './device-key-store.native';
import { openWebSocketCarrier } from './web-socket-carrier';

/*
 * The App's sockets on iOS and Android: the channel inside a WebSocket at the Server's URL, as a phone reaches an Expo dev server (ADR-0045). The Device Key sits in the Keychain or Keystore.
 */
export const appChannelPlatform: ChannelPlatform = {
  openSocket: openWebSocketCarrier,
  randomBytes: getRandomBytes,
  deviceKey: loadDeviceKey,
  // A Device says only what it is; the Ticket belongs to the one Connection that spends it.
  claim: () => ({
    name: Platform.OS === 'ios' ? 'iPhone' : 'Android phone',
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  }),
};
