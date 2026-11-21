import type { RunCheckout } from '../../runs';

type ArchivedTerminals = {
  sessionIds: readonly string[];
  checkout?: RunCheckout;
};

// The live Engine supplies this to an archive command. Startup has already recovered all terminals.
export type ArchiveTerminals = {
  close: (target: ArchivedTerminals) => Promise<void>;
  removeCheckout: (
    checkout: RunCheckout,
    remove: () => Promise<void>,
  ) => Promise<void>;
};
