import { writeLog } from '@repo/machine-log';
import { announceWhileLocalNetworkAccessIsOn } from '../network-access';
import { readSystemInfo } from '../system';
import type { HttpServerOptions, RoutedSetup } from './http-server';

// What an App lists this Server by: the computer's name unless a test says otherwise. The announcement and the QR carry the same one, or a Device would re-resolve a name nothing answers to.
export const discoveryNameOf = (options: HttpServerOptions): string =>
  options.discoveryName ?? readSystemInfo(options).name;

// Announces the Server on the local network for as long as Local network access is on; answers a function that says goodbye.
export const announceServer = (
  options: HttpServerOptions,
  setup: RoutedSetup,
): (() => Promise<void>) =>
  announceWhileLocalNetworkAccessIsOn(
    setup.localNetworkAccess,
    {
      name: discoveryNameOf(options),
      key: setup.serverPublicKey,
      port: options.port,
    },
    (line): void => writeLog({ home: options.home, label: 'engine', line }),
  );
