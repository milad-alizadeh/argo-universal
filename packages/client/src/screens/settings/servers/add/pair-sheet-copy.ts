import { discoveryProtocol, discoveryServiceType } from '@repo/contracts';
import { productName } from '@repo/contracts/product-identity';
import type { IconName } from '@repo/kit/symbols/icon-names';

// The pages that stop Add a Server short of a Server and say why: Local Network is off, iOS has not been answered, the build never asked, the Server is being looked for, or the network did not announce it.
export type PairSheetKind =
  | 'denied'
  | 'undetermined'
  | 'misconfigured'
  | 'finding'
  | 'not-found';

// What backs the words up: where in Settings to act, the lines a developer adds, or the address field.
export type Evidence =
  | { kind: 'settings'; icon: IconName; lead: string; detail: string }
  | { kind: 'code'; label: string; name: string; value: string }
  | { kind: 'address'; placeholder: string; hint: string };

export interface PairSheetCopy {
  tone: 'info' | 'warning' | 'neutral';
  icon?: IconName;
  badge?: string;
  inline?: boolean;
  title: string;
  body: string;
  evidence?: Evidence;
}

const service = `_${discoveryServiceType}._${discoveryProtocol}`;

/*
 * The words of each sheet, from the approved designs (Pairing pages, direction B). The Server is named where the sheet is about finding it.
 */
export const pairSheetCopy = (
  kind: PairSheetKind,
  serverName: string,
): PairSheetCopy => copies[kind](serverName);

const copies: Record<PairSheetKind, (serverName: string) => PairSheetCopy> = {
  denied: (serverName) => ({
    tone: 'info',
    icon: 'network-off',
    title: 'Local Network is off',
    body: `${productName} needs it to find ${serverName} on your Wi-Fi.`,
    evidence: {
      kind: 'settings',
      icon: 'settings',
      lead: 'Settings › Privacy & Security ›',
      detail: `Local Network › ${productName}`,
    },
  }),
  undetermined: () => ({
    tone: 'info',
    icon: 'web',
    title: 'Waiting for Local Network access',
    body: `If iOS asks, tap Allow. ${productName} is still looking.`,
    evidence: {
      kind: 'settings',
      icon: 'settings',
      lead: 'No question? In Settings, open',
      detail: 'Privacy & Security › Local Network',
    },
  }),
  misconfigured: () => ({
    tone: 'warning',
    icon: 'code',
    badge: 'Debug build only',
    title: 'This build can’t look for Servers',
    body: 'Add this to Info.plist, then rebuild.',
    evidence: {
      kind: 'code',
      label: 'Info.plist',
      name: 'NSBonjourServices',
      value: service,
    },
  }),
  finding: (serverName) => ({
    tone: 'info',
    inline: true,
    title: `Finding ${serverName}`,
    body: 'Looking on your Wi-Fi',
  }),
  'not-found': (serverName) => ({
    tone: 'neutral',
    icon: 'computer-off',
    title: `Can’t find ${serverName}`,
    body: 'Type its address to pair directly.',
    evidence: {
      kind: 'address',
      placeholder: 'studio.local:4000',
      hint: 'Address and port, or a link like http://studio.tailnet.ts.net:4000',
    },
  }),
};
