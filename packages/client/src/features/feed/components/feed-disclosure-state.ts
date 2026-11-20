import { useState } from 'react';

interface DisclosureOpen {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bodyKey: number;
}

interface DisclosureState {
  entryKey: string | undefined;
  open: boolean;
  wasOpened: boolean;
  bodyKey: number;
}

function initialState(
  entryKey: string | undefined,
  open: boolean,
  bodyKey = 0,
): DisclosureState {
  return { entryKey, open, wasOpened: open, bodyKey };
}

function reuseDisclosure(
  state: DisclosureState,
  entryKey: string | undefined,
  initialOpen: boolean,
): DisclosureState {
  if (state.entryKey === entryKey) return state;

  // An untouched closed body has no content or motion to discard.
  const bodyKey = state.bodyKey + Number(state.wasOpened || initialOpen);

  return initialState(entryKey, initialOpen, bodyKey);
}

interface DisclosureIdentity {
  entryKey?: string;
  initialOpen?: boolean;
}

export function useDisclosureOpen({
  entryKey,
  initialOpen = false,
}: DisclosureIdentity): DisclosureOpen {
  const [state, setState] = useState(() => initialState(entryKey, initialOpen));

  const entry = reuseDisclosure(state, entryKey, initialOpen);

  if (entry !== state) setState(entry);

  return {
    open: entry.open,
    bodyKey: entry.bodyKey,
    onOpenChange: (open) =>
      setState({ ...entry, open, wasOpened: entry.wasOpened || open }),
  };
}
