import { sameHost } from '@repo/contracts/plugins';
import type { Hop } from '../services/plugin-fetch-response';

export type AccountCredential = { header: string; value: string };

export function withCredential(hop: Hop, credential: AccountCredential): Hop {
  const headers = withoutCredential(hop.headers, credential.header);

  return {
    ...hop,
    headers: { ...headers, [credential.header]: credential.value },
    accountHeader: credential.header,
  };
}

// The network follows redirects; Accounts alone decides where its header may travel.
export function confineAccountHeaders(hop: Hop, url: URL): Hop['headers'] {
  if (!hop.accountHeader) return hop.headers;

  return sameHost(url.host, hop.url.host)
    ? hop.headers
    : withoutCredential(hop.headers, hop.accountHeader);
}

const withoutCredential = (
  headers: Hop['headers'],
  header: string,
): Hop['headers'] =>
  Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) => name.toLowerCase() !== header.toLowerCase(),
    ),
  );
