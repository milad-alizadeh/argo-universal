// The Origin the desktop App's page has; a web App's is this computer on the Expo port.
const appPageOrigin = 'app://app';

/*
 * A WebSocket that sends the headers a page's upgrade would. A browser writes the `Origin` itself, and that is what admits the Connection as the Server Device (#1696).
 * Node's WebSocket writes no `Origin`, so a test standing in for a page says which page it is.
 */
export const headerSocket = (
  headers: Record<string, string>,
): typeof WebSocket =>
  class extends WebSocket {
    constructor(url: string | URL) {
      super(url, { headers });
    }
  };

// A WebSocket opened the way the App's own page opens one.
export const AppPageSocket = headerSocket({ origin: appPageOrigin });
