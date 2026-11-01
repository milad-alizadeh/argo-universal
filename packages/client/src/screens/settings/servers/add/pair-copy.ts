import type { IconName } from '@repo/kit/symbols/icon-names';

export type PairPageKind =
  | 'waiting'
  | 'expired'
  | 'declined'
  | 'unanswered'
  | 'not-found';

// What a page of Add a Server says. `action` is the one thing the owner can do from the page: Cancel while it waits, and the way on once it has ended. The way back is the header's.
export interface PairCopy {
  icon: IconName;
  title: string;
  description: string;
  action: string;
}

// Where the Server Device puts a new code, in the words its own pages use. Never "Mac": a Server Device may be Windows or Linux.
const whereToLook = 'Settings › Devices › Pair a Device';

const tryAgain = 'Try again';

/*
 * The words of each page, from the approved designs (#1490). The Server is named wherever the owner might otherwise not know which computer is meant, and "Allow this Device?" is quoted because it is what the other computer's own prompt says.
 */
export const pairCopy = (
  kind: PairPageKind,
  serverName: string,
  way: PairWay = 'scan',
): PairCopy => ({ ...copies[kind](serverName), ...typedCopies[way][kind] });

// How the code reached this Device: read off the other computer's screen, or typed from it (#1502). The pages are the same; only the words that name the camera change.
export type PairWay = 'scan' | 'type';

const typedCopies: Record<
  PairWay,
  Partial<Record<PairPageKind, Partial<PairCopy>>>
> = {
  scan: {},
  type: {
    expired: { action: 'Type a new code' },
    declined: {
      description:
        'The other computer did not allow this Device, so it is not paired. Type a new code to try again.',
    },
    'not-found': {
      title: 'Can’t find that computer',
      description:
        'It may be asleep or turned off, or this computer may be on a different network. The code works until it changes.',
    },
  },
};

const copies: Record<PairPageKind, (serverName: string) => PairCopy> = {
  waiting: (serverName) => ({
    icon: 'waiting',
    title: 'Waiting for approval',
    description: `${serverName} is asking whether to allow this Device. On that computer, press Allow on “Allow this Device?”. It stays here until someone answers.`,
    action: 'Cancel',
  }),
  expired: () => ({
    icon: 'clock',
    title: 'This code has expired',
    description: `A code works for two minutes, and only once. On that computer, open ${whereToLook} for a new one.`,
    action: 'Scan again',
  }),
  declined: (serverName) => ({
    icon: 'failed',
    title: 'The owner said no',
    description: `${serverName} did not allow this Device, so it is not paired. Scan a new code to try again.`,
    action: 'Pair again',
  }),
  unanswered: (serverName) => ({
    icon: 'clock',
    title: 'Nobody answered',
    description: `Nobody answered on the other computer, or the question was closed. Check ${serverName} is awake, then try again.`,
    action: tryAgain,
  }),
  'not-found': (serverName) => ({
    icon: 'computer',
    title: `Can’t find ${serverName}`,
    description:
      'It may be asleep or turned off, or this phone may be on a different Wi-Fi. The code on its screen works until it changes.',
    action: tryAgain,
  }),
};
