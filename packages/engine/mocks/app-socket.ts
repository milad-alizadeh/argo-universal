// The Origin the desktop App's page has; a web App's is this computer on the Expo port.
const appPageOrigin = 'app://app';

/*
 * A WebSocket that sends the headers a page's upgrade would. A browser writes the `Origin` itself, and that is what admits the Connection as the Server Device (#1696).
 * Node's WebSocket writes no `Origin`, so a test standing in for a page says which page it is.
 */
export const headerSocket = (
  headers: Record<string, string>,
): typeof WebSocket =>
  // Node's WebSocket takes headers as a constructor option, which the DOM typing a client test compiles under does not know; Reflect.construct opens the same Connection without naming it.
  new Proxy(WebSocket, {
    construct: (socket, [url]) => Reflect.construct(socket, [url, { headers }]),
  });

// A WebSocket opened the way the App's own page opens one.
export const AppPageSocket = headerSocket({ origin: appPageOrigin });

// A fetch that sends the Origin the App's own page would, for a test whose caller is Node and so writes none.
export const appPageFetch =
  (send: typeof fetch): typeof fetch =>
  (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('origin', appPageOrigin);

    return send(input, { ...init, headers });
  };
