import { z } from 'zod';

// What Bonjour answers when the system refuses a browse: kDNSServiceErr_PolicyDenied is Local Network turned off for the App, and kDNSServiceErr_NoAuth is the same refusal on older systems.
const policyDenied = -65_570;

const noAuth = -65_555;

const Refusal = z.object({ code: z.literal([policyDenied, noAuth]) });

/*
 * Whether a browse error from the platform says the owner turned Local Network off. Read from `react-native-zeroconf`'s iOS `error` event, whose payload carries the DNSSD error as `code`; any other error is only logged.
 */
export const isLocalNetworkDenied = (cause: unknown): boolean =>
  Refusal.safeParse(cause).success;
