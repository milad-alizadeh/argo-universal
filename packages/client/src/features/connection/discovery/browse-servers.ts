import type { BrowseServers } from './resolve-server';

// A browser cannot listen for mDNS, and a web App is never a paired Device (ADR-0045): nothing is ever heard here, and a stored address answers.
export const browseServers: BrowseServers = () => (): void => undefined;

export const askForLocalNetworkAccess = (): Promise<
  'granted' | 'denied' | 'unknown'
> => Promise.resolve('granted');
