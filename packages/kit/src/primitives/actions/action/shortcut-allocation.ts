import { primaryModifier, type ActionShortcut } from '#primitives/content/kbd';
import { resolveShortcuts, shortcutId } from './action-shortcuts';
import type { ShortcutRegistration } from './shortcut-registry';

// A context declaration whose node may hold the focus, and the keys it claimed.
interface OpenContext {
  root: HTMLElement | null;
  claimed: Set<string>;
}

const allocationKey = (owner: string, action: string): string =>
  `${owner}/${action}`;

/*
 * Hands each key to the first declaration, in document order, that claims it while it can run. A context declaration
 * runs only while focus is inside its node, so two that sit side by side, as the rows of a List do, never run at
 * once: each claims its keys against the declarations around it, not against its siblings. Plugins keep the first
 * declaration's claim.
 */
export class ShortcutAllocation {
  private readonly owned = new Set<string>();
  private readonly primary = primaryModifier();
  private readonly any = new Set<string>();
  private readonly global = new Set<string>();
  private open: OpenContext[] = [];

  // Whether declaration `owner` won the key of its Action `action`.
  public owns(owner: string, action: string): boolean {
    return this.owned.has(allocationKey(owner, action));
  }

  // `root` is the declaration's node, found once for the whole pass.
  public add(entry: ShortcutRegistration, root: HTMLElement | null): void {
    this.open = this.open.filter((context) => context.root?.contains(root));

    const claimed = this.claim(entry, this.taken(entry));

    for (const id of claimed) this.any.add(id);

    this.record(entry.context, root, claimed);
  }

  private record(
    context: boolean,
    root: HTMLElement | null,
    claimed: Set<string>,
  ): void {
    if (context) this.open.push({ root, claimed });
    else for (const id of claimed) this.global.add(id);
  }

  /*
   * The keys a declaration cannot claim: any claimed before it, or for the App's own context declarations, only those
   * claimed around it. A Plugin's declaration never shares a key, so a later Plugin cannot take one an earlier one owns.
   */
  private taken({ context, plugin }: ShortcutRegistration): Set<string> {
    if (!context || plugin) return this.any;

    const around = this.open.flatMap((open) => [...open.claimed]);

    return new Set([...this.global, ...around]);
  }

  private claim(entry: ShortcutRegistration, taken: Set<string>): Set<string> {
    const { actions, plugin } = entry;
    const shortcuts = resolveShortcuts(actions, plugin, this.primary);
    const claimed = new Set<string>();

    for (const [index, action] of actions.entries()) {
      const id = this.free(shortcuts[index], taken);

      if (id === undefined) continue;

      claimed.add(id);
      this.owned.add(allocationKey(entry.id, action.id));
    }

    return claimed;
  }

  private free(
    shortcut: ActionShortcut | undefined,
    taken: Set<string>,
  ): string | undefined {
    if (!shortcut) return;

    const id = shortcutId(shortcut, this.primary);

    return taken.has(id) ? undefined : id;
  }
}
