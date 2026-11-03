import type { WireNode } from '@repo/contracts/plugins/wire';
import { drawsNothing } from '@repo/contracts/plugins/wire-empty-page';
import type { PluginOnEvent } from '../../../lib/product/plugin-registry';

// One Workbench card's page as the Session holds it: the tree it draws, and where its events go.
export interface HeldCardView {
  root: WireNode | null;
  // Changes when one live view replaces another, so the card starts over with no drafts from the old.
  treeKey: number;
  dispatch: PluginOnEvent;
}

// Who hears one kind of change, and the way to stop hearing it.
class Listeners<Args extends unknown[]> {
  private readonly heard = new Set<(...args: Args) => void>();

  public readonly add = (listener: (...args: Args) => void): (() => void) => {
    this.heard.add(listener);

    return () => {
      this.heard.delete(listener);
    };
  };

  public tell(...args: Args): void {
    for (const listener of this.heard) listener(...args);
  }
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
  private readonly changes = new Listeners<[]>();
  private readonly empties = new Listeners<[key: string]>();
  private filledKeys: readonly string[] = [];

  public readonly subscribe = this.changes.add;

  // Hears each card whose page drew something and then answered with nothing; not one still waiting, or released.
  public readonly whenEmptied = this.empties.add;

  // The cards whose page draws something, the same array until that changes.
  public readonly filled = (): readonly string[] => this.filledKeys;

  public view(key: string): HeldCardView | undefined {
    return this.views.get(key);
  }

  public hold(key: string, view: HeldCardView): void {
    const emptied = this.filledKeys.includes(key) && answeredNothing(view);

    this.views.set(key, view);
    this.changed();

    if (emptied) this.empties.tell(key);
  }

  public release(key: string): void {
    if (this.views.delete(key)) this.changed();
  }

  private changed(): void {
    const filled = [...this.views].flatMap(([key, { root }]) =>
      drawsNothing(root) ? [] : [key],
    );

    if (!sameKeys(filled, this.filledKeys)) this.filledKeys = filled;

    this.changes.tell();
  }
}
