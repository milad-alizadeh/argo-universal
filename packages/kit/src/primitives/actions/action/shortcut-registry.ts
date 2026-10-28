import type { DeclaredAction } from './action-declarations';
import { allocationKey, ShortcutAllocation } from './shortcut-allocation';

export interface ShortcutRegistration {
  id: string;
  actions: DeclaredAction[];
  plugin: boolean;
  // Its shortcuts run only while focus is inside the node carrying its id.
  context: boolean;
}

export class ShortcutRegistry {
  private readonly entries = new Map<string, ShortcutRegistration>();
  private readonly listeners = new Set<() => void>();
  private revision = 0;
  private allocated = new Set<string>();

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  public snapshot = (): number => this.revision;

  public register(entry: ShortcutRegistration): () => void {
    this.entries.set(entry.id, entry);
    this.changed();

    return () => {
      this.entries.delete(entry.id);
      this.changed();
    };
  }

  public owns(id: string, action: DeclaredAction): boolean {
    return this.allocated.has(allocationKey(id, action.id));
  }

  private changed(): void {
    this.allocated = allocatedActions([...this.entries.values()]);
    this.revision++;

    for (const listener of this.listeners) listener();
  }
}

function declarationOrder(
  left: ShortcutRegistration,
  right: ShortcutRegistration,
): number {
  const first = document.getElementById(left.id);
  const second = document.getElementById(right.id);

  return compareElements(first, second);
}

function compareElements(
  first: HTMLElement | null,
  second: HTMLElement | null,
): number {
  if (!first || !second) return 0;

  return comparePosition(first.compareDocumentPosition(second));
}

function comparePosition(position: number): number {
  const following = Node.DOCUMENT_POSITION_FOLLOWING;

  return [following, following + Node.DOCUMENT_POSITION_CONTAINED_BY].includes(
    position,
  )
    ? -1
    : 1;
}

function allocatedActions(entries: ShortcutRegistration[]): Set<string> {
  const allocation = new ShortcutAllocation();

  for (const entry of entries.sort(declarationOrder)) allocation.add(entry);

  return allocation.owned;
}
