import type { ConnectionBannerProps } from './connection-banner';

// A story supplies onRetry; a fixture is the Connection the banner reports.
type ConnectionBannerFixture = Omit<ConnectionBannerProps, 'onRetry'>;

const serverName = "Milad's Mac mini";

export const reconnectingBanner = {
  state: 'reconnecting',
  serverName,
} satisfies ConnectionBannerFixture;

export const offlineBanner = {
  state: 'offline',
  serverName,
} satisfies ConnectionBannerFixture;
