const DEFAULT_STORYBOOK_SYNC_PORT = 7007;

const configuredSyncPort =
  process.env.EXPO_PUBLIC_STORYBOOK_WS_PORT ||
  String(DEFAULT_STORYBOOK_SYNC_PORT);

function isValidPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65_535;
}

/** @param {string} value */
export function storybookSyncPort(value = configuredSyncPort) {
  const port = Number(value);

  if (!isValidPort(port))
    throw new Error(
      `EXPO_PUBLIC_STORYBOOK_WS_PORT must be a port from 1 to 65535; received "${value}"`,
    );

  return port;
}

/** @param {string} value @returns {{ host: string; port: number }} */
export function storybookServerOptions(value = configuredSyncPort) {
  return { host: '127.0.0.1', port: storybookSyncPort(value) };
}
