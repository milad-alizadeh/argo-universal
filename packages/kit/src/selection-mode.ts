import {
  createContext,
  createElement,
  use,
  useEffect,
  useId,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

// What a List tells the host that owns its Screen's header (ADR-0043's one exception to a header declared once).
export interface SelectionMode {
  // The whole header while the List selects: its count, Select All and Done or Close, and the selected Actions. Null while it does not.
  header: ReactNode;
  // Starts selecting, for the host to draw a Select entry while the List is not; null where selecting starts from a row.
  begin: (() => void) | null;
}

interface Claim extends SelectionMode {
  owner: string;
}

interface Host {
  claim: Claim | null;
  setClaim: Dispatch<SetStateAction<Claim | null>>;
}

const SelectionModeHost = createContext<Host | null>(null);

const holds = (claim: Claim | null, owner: string): boolean =>
  !claim || claim.owner === owner;

const takes = (current: Claim, next: Claim): boolean =>
  current.owner === next.owner || (Boolean(next.header) && !current.header);

// One List owns a host at a time: the first to claim it, unless a List that is selecting claims it from one that is not.
function claimed(current: Claim | null, next: Claim): Claim {
  if (!current) return next;

  return takes(current, next) ? next : current;
}

// A List refused while another held the host asks again once it is free.
const isFree = (host: Host | null): boolean => host?.claim === null;

function useClaim(host: Host | null, mode: SelectionMode, owner: string): void {
  const setClaim = host?.setClaim;
  const free = isFree(host);

  useEffect(() => {
    setClaim?.((current) => claimed(current, { ...mode, owner }));
  }, [setClaim, mode, owner, free]);

  useEffect(
    () => (): void =>
      setClaim?.((current) => (current?.owner === owner ? null : current)),
    [setClaim, owner],
  );
}

// A List asks to own its host's header. True while it does, or until another List does; a List with no host, or one refused, draws its own toolbar.
export function useSelectionMode(mode: SelectionMode): boolean {
  const host = use(SelectionModeHost);
  const owner = useId();

  useClaim(host, mode, owner);

  return host !== null && holds(host.claim, owner);
}

// What the List that owns this host offers. A Screen, and the Sessions sidebar's header row, read it to draw.
export function useSelectionModeHost(): SelectionMode | null {
  return use(SelectionModeHost)?.claim ?? null;
}

export function SelectionModeScope({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [claim, setClaim] = useState<Claim | null>(null);
  const host = useMemo(() => ({ claim, setClaim }), [claim]);

  return createElement(SelectionModeHost, { value: host }, children);
}
