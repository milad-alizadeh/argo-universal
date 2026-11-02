import type { ChannelPlatform } from './channel-transport';

const notPaired = (): never => {
  throw new Error('A web App is the Server Device only; it cannot be paired');
};

// A browser has no raw sockets and no secure storage, so a web App is never a Paired Device (ADR-0045) and nothing here opens a channel.
export const appChannelPlatform: ChannelPlatform = {
  openSocket: async () => notPaired(),
  randomBytes: (length) => crypto.getRandomValues(new Uint8Array(length)),
  deviceKey: async () => notPaired(),
  claim: notPaired,
};
