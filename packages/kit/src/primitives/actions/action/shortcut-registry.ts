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
  private pending = false;

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

  // A List's rows register together as it draws, so the keys are handed out once for all of them.
  private changed(): void {
    if (this.pending) return;

    this.pending = true;
    queueMicrotask(this.allocate);
  }

  private readonly allocate = (): void => {
    this.pending = false;
    this.allocated = allocatedActions([...this.entries.values()]);
    this.revision++;

    for (const listener of this.listeners) listener();
  };
}

interface Placed {
  entry: ShortcutRegistration;
  root: HTMLElement | null;
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

// Each declaration's node is found once, then the declarations claim their keys in document order.
function allocatedActions(entries: ShortcutRegistration[]): Set<string> {
  const allocation = new ShortcutAllocation();

  const placed: Placed[] = entries.map((entry) => ({
    entry,
    root: document.getElementById(entry.id),
  }));

  placed.sort((left, right) => compareElements(left.root, right.root));

  for (const { entry, root } of placed) allocation.add(entry, root);

  return allocation.owned;
}
