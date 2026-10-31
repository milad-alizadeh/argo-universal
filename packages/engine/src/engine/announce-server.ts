import { writeLog } from '@repo/machine-log';
import { announceWhileLocalNetworkAccessIsOn } from '../network-access';
import { readSystemInfo } from '../system';
import type { HttpServerOptions, RoutedSetup } from './http-server';

// Announces the Server on the local network for as long as Local network access is on; answers a function that says goodbye.
export const announceServer = (
  options: HttpServerOptions,
  setup: RoutedSetup,
): (() => Promise<void>) =>
  announceWhileLocalNetworkAccessIsOn(
    setup.localNetworkAccess,
    {
      name: options.discoveryName ?? readSystemInfo(options).name,
      key: setup.serverPublicKey,
      port: options.port,
    },
    (line): void => writeLog({ home: options.home, label: 'engine', line }),
  );
