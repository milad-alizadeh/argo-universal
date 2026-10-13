export type ClosureStep = 'discard' | 'flush' | 'close';

type ClosureFacts = { kept: boolean; feedEnded: boolean };

// A New Session no prompt reached leaves nothing behind; a kept one flushes its Feed unless the Feed already ended.
export const nextClosureStep = ({
  kept,
  feedEnded,
}: ClosureFacts): ClosureStep => {
  if (!kept) return 'discard';

  return feedEnded ? 'close' : 'flush';
};
