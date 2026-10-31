import {
  type DiscoveredServer,
  discoveryKeyField,
  discoveryProtocol,
  discoveryServiceType,
} from '@repo/contracts';
import Zeroconf, { type Service } from 'react-native-zeroconf';
import type { BrowseServers } from './resolve-server';

const ipv4 = /^\d+\.\d+\.\d+\.\d+$/;

const keyOf = (service: Service): string =>
  service.txt[discoveryKeyField] ?? '';

function toServer(service: Service): DiscoveredServer | undefined {
  const key = keyOf(service);

  return key
    ? {
        name: service.name,
        key,
        addresses: service.addresses.filter((address) => ipv4.test(address)),
        port: service.port,
      }
    : undefined;
}

const scanning = {
  type: discoveryServiceType,
  protocol: discoveryProtocol,
} as const;

// Every Argo Server resolved so far, by name; one that is removed from the network is dropped.
class Heard {
  private readonly servers = new Map<string, DiscoveredServer>();

  public constructor(
    private readonly listener: (servers: readonly DiscoveredServer[]) => void,
  ) {}

  public resolved(service: Service): void {
    const server = toServer(service);

    if (server) this.servers.set(service.name, server);
    this.listener([...this.servers.values()]);
  }

  public removed(name: string): void {
    this.servers.delete(name);
    this.listener([...this.servers.values()]);
  }
}

// Bonjour on iOS, NSD on Android. Unverified on a device (#1527): in the #1488 spike Android reported a service found but no resolved address was seen.
export const browseServers: BrowseServers = (listener) => {
  const zeroconf = new Zeroconf();
  const heard = new Heard(listener);

  zeroconf.on('resolved', (service): void => heard.resolved(service));
  zeroconf.on('remove', (name): void => heard.removed(name));
  // A denied permission or a missing service type arrives here; the list stays empty and the stored address answers.
  zeroconf.on('error', (): void => undefined);
  zeroconf.scan(scanning);

  return (): void => {
    zeroconf.stop();
    zeroconf.removeDeviceListeners();
  };
};

// Asks iOS for the local-network permission, once; it shows the system prompt only while the question is unanswered. 'granted' also where there is nothing to ask.
export const askForLocalNetworkAccess = (): Promise<
  'granted' | 'denied' | 'unknown'
> => new Zeroconf().checkLocalNetworkAccess(scanning);
