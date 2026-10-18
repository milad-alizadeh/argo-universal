import { primaryModifier } from '#primitives/content/kbd';
import type { DeclaredAction } from './action-declarations';
import { resolveShortcuts } from './action-shortcuts';

export interface ShortcutRegistration {
  id: string;
  actions: DeclaredAction[];
  plugin: boolean;
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

function registeredActions(
  entry: ShortcutRegistration,
): (DeclaredAction & { plugin: boolean; owner: string })[] {
  return entry.actions.map((action) => ({
    ...action,
    plugin: entry.plugin,
    owner: entry.id,
  }));
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
  return position === Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function allocationKey(owner: string, action: string): string {
  return `${owner}/${action}`;
}

function allocatedActions(entries: ShortcutRegistration[]): Set<string> {
  const declarations = entries
    .sort(declarationOrder)
    .flatMap(registeredActions);

  const shortcuts = resolveShortcuts(declarations, false, primaryModifier());

  return new Set(
    declarations.flatMap((action, index) =>
      shortcuts[index] ? [allocationKey(action.owner, action.id)] : [],
    ),
  );
}
