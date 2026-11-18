// What Bonjour answers when the system refuses a browse: kDNSServiceErr_PolicyDenied is Local Network turned off for the App, and kDNSServiceErr_NoAuth is the same refusal on older systems.
const deniedCodes: ReadonlySet<unknown> = new Set([-65_570, -65_555]);

/*
 * Whether a browse error from the platform says the owner turned Local Network off. Read from `react-native-zeroconf`'s iOS `error` event, whose payload carries the DNSSD error as `code`; any other error is only logged.
 */
export const isLocalNetworkDenied = (cause: unknown): boolean =>
  typeof cause === 'object' &&
  cause !== null &&
  'code' in cause &&
  deniedCodes.has(cause.code);
