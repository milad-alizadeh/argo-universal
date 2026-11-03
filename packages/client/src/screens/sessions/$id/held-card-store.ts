import type { WireNode } from '@repo/contracts/plugins/wire';
import { drawsNothing } from '@repo/contracts/plugins/wire-empty-page';
import type { PluginOnEvent } from '../../../lib/product/plugin-registry';
import { StoreListeners } from '../../../lib/store-listeners';

// One Workbench card's page as the Session holds it: the tree it draws, and where its events go.
export interface HeldCardView {
  root: WireNode | null;
  // Changes when one live view replaces another, so the card starts over with no drafts from the old.
  treeKey: number;
  dispatch: PluginOnEvent;
}

const sameKeys = (one: readonly string[], other: readonly string[]): boolean =>
  one.length === other.length && one.every((key, at) => other[at] === key);

// The page answered, and its answer draws nothing; a view with no tree yet is still waiting.
const answeredNothing = ({ root }: HeldCardView): boolean =>
  root !== null && drawsNothing(root);

/*
 * The views a Session holds for its Plugin cards, by card key. A card draws from its view here, and the Workbench
 * reads only which cards have something to show, so a change inside one card redraws that card alone.
 */
export class HeldCardStore {
  private readonly views = new Map<string, HeldCardView>();
  private readonly changes = new StoreListeners();
  private filledKeys: readonly string[] = [];

  public readonly subscribe = this.changes.subscribe;

  // The cards whose page draws something, the same array until that changes.
  public readonly filled = (): readonly string[] => this.filledKeys;

  public view(key: string): HeldCardView | undefined {
    return this.views.get(key);
  }

  // Holds the card's latest view; true when its page drew something and now answered with nothing, not when it waits.
  public hold(key: string, view: HeldCardView): boolean {
    const emptied = this.filledKeys.includes(key) && answeredNothing(view);

    this.views.set(key, view);
    this.changed();

    return emptied;
  }

  public release(key: string): void {
    if (this.views.delete(key)) this.changed();
  }

  private changed(): void {
    const filled = [...this.views].flatMap(([key, { root }]) =>
      drawsNothing(root) ? [] : [key],
    );

    if (!sameKeys(filled, this.filledKeys)) this.filledKeys = filled;

    this.changes.notify();
  }
}
