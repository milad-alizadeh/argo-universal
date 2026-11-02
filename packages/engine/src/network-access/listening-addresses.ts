import { interfaceAddresses } from './advertiser';

// Where this computer answers on each of its networks, as `host:port`: what an owner types on a Device that cannot find it by itself.
export const listeningAddresses = (
  port: number,
  hosts: readonly string[] = interfaceAddresses(),
): string[] => hosts.map((host) => `${host}:${port}`);
