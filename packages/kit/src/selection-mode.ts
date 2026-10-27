import {
  createContext,
  createElement,
  use,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ActionGroup } from '#primitives/actions/action';
import { createPlace, useClaim, useClaimed, type Place } from './place';

// What a List tells the Screen that owns its header (ADR-0043's one exception to a header declared once).
export interface SelectionBar {
  title: string;
  allSelected: boolean;
  onSelectAll: () => void;
  onClose: () => void;
  // The selected Actions, for the native bar to draw.
  groups: ActionGroup[];
}

export interface SelectionMode {
  // What a phone's stack draws as its own header meanwhile; null while the List does not select, and on the web.
  bar: SelectionBar | null;
  // The whole header while the List selects: its count, Select All and Done or Close, and the selected Actions. Null while it does not.
  header: ReactNode;
  // Starts selecting, for the Screen to draw a Select entry while the List is not; null where selecting starts from a row.
  begin: (() => void) | null;
}

interface Claimed extends SelectionMode {
  owner: string;
}

// One List owns the Screen's header at a time: the first to claim it, unless a List that is selecting claims it from one that is not.
const selectingOutranks = (
  holding: Claimed | undefined,
  next: Claimed,
): boolean => Boolean(next.header) && !holding?.header;

const SelectionModePlaceOffer = createContext<Place<Claimed> | undefined>(
  undefined,
);

// Held by no one, so a List with no Screen above it reads it as free.
const unheldPlace = createPlace<Claimed>();

const holds = (claimed: Claimed | undefined, owner: string): boolean =>
  !claimed || claimed.owner === owner;

// A List asks to own its Screen's header. True while it does, or until another List does; a List with no Screen, or one refused, draws its own toolbar.
export function useOwnsSelectionHeader(mode: SelectionMode): boolean {
  const place = use(SelectionModePlaceOffer);
  const owner = useId();
  const claim = useMemo(() => ({ ...mode, owner }), [mode, owner]);

  useClaim(place, claim);
  const claimed = useClaimed(place ?? unheldPlace);

  return place !== undefined && holds(claimed, owner);
}

// What the List that owns the header offers. A Screen, and the Sessions sidebar's header row, read it to draw.
export function useClaimedSelectionMode(): SelectionMode | null {
  return useClaimed(use(SelectionModePlaceOffer) ?? unheldPlace) ?? null;
}

export function SelectionModeScope({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [place] = useState(() => createPlace(selectingOutranks));

  return createElement(SelectionModePlaceOffer, { value: place }, children);
}
