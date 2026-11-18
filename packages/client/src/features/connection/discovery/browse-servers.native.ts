import {
  discoveryProtocol,
  discoveryServiceType,
  HeardServers,
} from '@repo/contracts';
import Zeroconf from 'react-native-zeroconf';
import type { BrowseServers } from './resolve-server';

// Bonjour on iOS, NSD on Android. Unverified on a device (#1527): in the #1488 spike Android reported a service found but no resolved address was seen.
export const browseServers: BrowseServers = (listener) => {
  const zeroconf = new Zeroconf();
  const heard = new HeardServers(listener);

  zeroconf.on('resolved', (service): void => heard.up(service.name, service));
  zeroconf.on('remove', (name): void => heard.down(name));
  // A denied Local Network permission or a missing service type arrives here. The list stays empty and the code's URLs or the stored address answer, but the reason is said rather than lost.
  zeroconf.on('error', (cause): void =>
    console.warn('Could not look for Servers on the local network', cause),
  );
  zeroconf.scan({ type: discoveryServiceType, protocol: discoveryProtocol });

  return (): void => {
    zeroconf.stop();
    zeroconf.removeDeviceListeners();
  };
};
