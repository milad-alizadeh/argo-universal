import type { BrowseServers } from './resolve-server';

// A browser cannot listen for mDNS, and a web App is never a paired Device (ADR-0045): there is nothing to browse with, so a stored address is the only answer and nothing waits for one.
export const browseServers: BrowseServers | null = null;
