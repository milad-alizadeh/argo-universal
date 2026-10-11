export type ClosureStep = 'discard' | 'flush' | 'close';

type ClosureFacts = { stored: boolean; feedEnded: boolean };

// A Session never stored leaves no Checkout behind; a stored one flushes its Feed unless the Feed already ended.
export const nextClosureStep = ({
  stored,
  feedEnded,
}: ClosureFacts): ClosureStep => {
  if (!stored) return 'discard';
  return feedEnded ? 'close' : 'flush';
};
