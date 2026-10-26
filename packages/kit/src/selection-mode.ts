import {
  createContext,
  createElement,
  use,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPlace, useClaim, useClaimed, type Place } from './place';

// What a List tells the host that owns its Screen's header (ADR-0043's one exception to a header declared once).
export interface SelectionMode {
  // The whole header while the List selects: its count, Select All and Done or Close, and the selected Actions. Null while it does not.
  header: ReactNode;
  // Starts selecting, for the host to draw a Select entry while the List is not; null where selecting starts from a row.
  begin: (() => void) | null;
}

interface Claimed extends SelectionMode {
  owner: string;
}

// One List owns a host at a time: the first to claim it, unless a List that is selecting claims it from one that is not.
const selectingOutranks = (
  holding: Claimed | undefined,
  next: Claimed,
): boolean => Boolean(next.header) && !holding?.header;

const SelectionModeHost = createContext<Place<Claimed> | undefined>(undefined);

// Held by no one, so a List with no host reads it as free.
const unhosted = createPlace<Claimed>();

const holds = (claimed: Claimed | undefined, owner: string): boolean =>
  !claimed || claimed.owner === owner;

// A List asks to own its host's header. True while it does, or until another List does; a List with no host, or one refused, draws its own toolbar.
export function useSelectionMode(mode: SelectionMode): boolean {
  const host = use(SelectionModeHost);
  const owner = useId();
  const claim = useMemo(() => ({ ...mode, owner }), [mode, owner]);

  useClaim(host, claim);
  const claimed = useClaimed(host ?? unhosted);

  return host !== undefined && holds(claimed, owner);
}

// What the List that owns this host offers. A Screen, and the Sessions sidebar's header row, read it to draw.
export function useSelectionModeHost(): SelectionMode | null {
  return useClaimed(use(SelectionModeHost) ?? unhosted) ?? null;
}

export function SelectionModeScope({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [host] = useState(() => createPlace(selectingOutranks));

  return createElement(SelectionModeHost, { value: host }, children);
}
