import { productName } from '@repo/contracts/product-identity';
import type { IconName } from '@repo/kit/symbols/icon-names';

// The three ways Local Network keeps a phone from looking: the owner turned it off, the build never declared it, or iOS has not been answered yet.
export type LocalNetworkKind = 'denied' | 'misconfigured' | 'undetermined';

// Where the setting lives, in the words iOS uses.
const privacy = 'Privacy & Security › Local Network';

// What a page says, and the note that tells the owner where to act. `icon` is absent where the page shows a spinner instead.
export interface LocalNetworkCopy {
  icon?: IconName;
  title: string;
  description: string;
  note: { lead: string; detail: string };
}

/*
 * The words of the Local Network pages, from the approved designs (cards 1A, 1C and 1E of Pairing gaps). The Server is named where the page is about finding it.
 */
export const localNetworkCopy = (
  kind: LocalNetworkKind,
  serverName: string,
  service: string,
): LocalNetworkCopy => copies[kind](serverName, service);

const copies: Record<
  LocalNetworkKind,
  (serverName: string, service: string) => LocalNetworkCopy
> = {
  denied: (serverName) => ({
    icon: 'refused',
    title: 'Local Network is off',
    description: `${productName} needs it to find ${serverName} on your Wi-Fi. Turn it on in Settings, then come back here.`,
    note: {
      lead: 'On this iPhone, open Settings, then',
      detail: `${privacy} › ${productName}`,
    },
  }),
  misconfigured: (_serverName, service) => ({
    icon: 'warning',
    title: 'This build can’t look for Servers',
    description: `iOS will not let it ask for Local Network access. Install a newer build of ${productName}, then try again.`,
    note: {
      lead: 'For developers',
      detail: `Info.plist needs ${service} under NSBonjourServices. Rebuild the app.`,
    },
  }),
  undetermined: () => ({
    title: 'Waiting for Local Network access',
    description: `If iOS asks to let ${productName} find devices on your local network, choose Allow. ${productName} is still looking.`,
    note: { lead: 'No question showing? In Settings, open', detail: privacy },
  }),
};
