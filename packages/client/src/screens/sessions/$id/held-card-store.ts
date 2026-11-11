import type { WireNode } from '@repo/contracts/plugins/wire';
import { drawsNothing } from '@repo/contracts/plugins/wire-empty-page';
import type { OnPageCall } from '../../../lib/product/plugin-registry';
import { StoreListeners } from '../../../lib/store-listeners';

// One Workbench card's page as the Session holds it: the tree it answered, and where its Operation calls go.
export interface HeldCardPage {
  // None while the page has not answered.
  root: WireNode | null;
  onPageCall: OnPageCall;
}

const sameKeys = (one: readonly string[], other: readonly string[]): boolean =>
  one.length === other.length && one.every((key, at) => other[at] === key);

// The page answered, and its answer draws nothing; a page with no tree yet is still waiting.
const answeredNothing = ({ root }: HeldCardPage): boolean =>
  root !== null && drawsNothing(root);

/*
 * The pages a Session holds for its Plugin cards, by card key. A card draws from its page here, and the Workbench
 * reads only which cards have something to show, so a change inside one card redraws that card alone.
 */
export class HeldCardStore {
  private readonly pages = new Map<string, HeldCardPage>();
  private readonly changes = new StoreListeners();
  private filledKeys: readonly string[] = [];

  public readonly subscribe = this.changes.subscribe;

  // The cards whose page draws something, the same array until that changes.
  public readonly filled = (): readonly string[] => this.filledKeys;

  public page(key: string): HeldCardPage | undefined {
    return this.pages.get(key);
  }

  // Holds the card's latest page; true when it drew something and now answers with nothing, not when it waits.
  public hold(key: string, page: HeldCardPage): boolean {
    const emptied = this.filledKeys.includes(key) && answeredNothing(page);

    this.pages.set(key, page);
    this.changed();

    return emptied;
  }

  public release(key: string): void {
    if (this.pages.delete(key)) this.changed();
  }

  private changed(): void {
    const filled = [...this.pages].flatMap(([key, { root }]) =>
      drawsNothing(root) ? [] : [key],
    );

    if (!sameKeys(filled, this.filledKeys)) this.filledKeys = filled;

    this.changes.notify();
  }
}
