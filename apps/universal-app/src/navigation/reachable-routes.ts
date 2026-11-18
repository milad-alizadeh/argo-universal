export const appRoutes = ['(frame)', 'screen/[id]', 'open/[...link]'] as const;

const pairRoutes = ['pair'] as const;

interface Held {
  showsServer: boolean;
  // A build that carries the pairing code in its link must reach Pairing whether or not it holds a Server.
  pairLink: boolean;
}

const reachesPairing = ({ showsServer, pairLink }: Held): boolean =>
  !showsServer || pairLink;

export const reachableRoutes = (held: Held): readonly string[] => [
  ...(held.showsServer ? appRoutes : []),
  ...(reachesPairing(held) ? pairRoutes : []),
];
