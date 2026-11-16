import { isSpecialHost, type FetchCapability } from '@repo/contracts/plugins';
import { CapabilityRefusal } from './capability-refusal';

// A fetch hop the Capabilities allow; `private` is true only for a raw address or `localhost` declared with a reason.
export type HostRule = { private: boolean };

/*
 * Only a raw address, `localhost` or `*.localhost`, declared with a reason, may reach a loopback or
 * private address. A named host never does, so its DNS answer can't rebind it onto this Mac.
 */
export const exactHost = ({ host, reason }: FetchCapability): HostRule => ({
  private: Boolean(reason) && isSpecialHost(host),
});

export function anyHost(capabilities: FetchCapability[], url: URL): HostRule {
  if (capabilities.some(({ host }) => host === '*')) return { private: false };

  throw new CapabilityRefusal(
    `${url.host} is not a declared host. Add { "kind": "fetch", "host": "${url.host}" } to capabilities in plugin.json.`,
  );
}
