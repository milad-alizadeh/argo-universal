import { applyListMove, type ListMove } from '@repo/contracts/kit-moves';
import { useSyncExternalStore } from 'react';
import { listenerSet } from '../../../listener-set';
import { RowFocus, type FocusRow, type MoveNotice } from './list-move-feedback';
import {
  placeOf,
  type MoveSection,
  type ResolvedMove,
  type SectionKey,
} from './list-move-model';

// A Plugin's `onMove` answers once its dispatch settles; an App owner's answers at once.
export type MoveAnswer = (move: ListMove) => void | Promise<void>;

// What the List's owner last drew: its order, its answer to a move, whether its Sections draw as lanes, and each movable row's title.
export interface MoveOwner {
  base: readonly MoveSection[];
  onMove: MoveAnswer;
  lanes: boolean;
  titles: ReadonlyMap<string, string>;
}

// Which steps a row's Move menu offers: up, down, both or neither. Its Move to… entry is always there.
export type MenuSteps = 'up' | 'down' | 'both' | 'none';

const withUp = (down: boolean): MenuSteps => (down ? 'both' : 'up');

const withoutUp = (down: boolean): MenuSteps => (down ? 'down' : 'none');

const stepsOf = (index: number, length: number): MenuSteps =>
  (index > 0 ? withUp : withoutUp)(index < length - 1);

export interface MoveEffects {
  // Runs the owner's answer, and reports a refusal with one error toast.
  report: (answer: () => void | Promise<void>) => Promise<void>;
  frame: (step: () => void) => void;
}

// A move the List shows before its owner answers it, and the owner's order it was made on.
export interface HeldMove {
  move: ListMove;
  base: readonly MoveSection[];
}

const sameRows = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const sameSection = (a: MoveSection, b: MoveSection | undefined): boolean =>
  b !== undefined && a.key === b.key && sameRows(a.rows, b.rows);

// The owner has not drawn another order: the same Sections, holding the same rows in the same order.
const sameOrder = (
  a: readonly MoveSection[],
  b: readonly MoveSection[],
): boolean =>
  a.length === b.length &&
  a.every((section, index) => sameSection(section, b[index]));

// The order the List shows over its owner's: the held move's, until the owner draws another order.
export function shownSections(
  held: HeldMove | null,
  base: readonly MoveSection[],
): readonly MoveSection[] {
  if (!held || !sameOrder(held.base, base)) return base;

  return applyListMove(base, held.move);
}

const nextNotice = (last: MoveNotice | null, text: string): MoveNotice => ({
  text,
  count: (last?.count ?? 0) + 1,
});

/*
 * The order a List with `onMove` shows, as an external store. A move shows at once: it is held over the owner's order
 * until the owner draws another, or a frame after its `onMove` settles; a refused move goes back with one error toast
 * (ADR-0031). After a move, focus stays on the moved row and a screen reader hears where it landed. A row, zone or lane
 * reads only the part it draws, so a move redraws the rows whose menu changes rather than every row.
 */
export class MoveOrder {
  private readonly listeners = listenerSet();
  public readonly subscribe = this.listeners.subscribe;
  private readonly focus: RowFocus;
  private shown: readonly MoveSection[];
  private picked: string | undefined;
  private current: HeldMove | null = null;
  private told: MoveNotice | null = null;

  public constructor(
    private owner: MoveOwner,
    private readonly effects: MoveEffects,
  ) {
    this.focus = new RowFocus(effects.frame);
    this.shown = owner.base;
  }

  public get sections(): readonly MoveSection[] {
    return this.shown;
  }

  public get lanes(): boolean {
    return this.owner.lanes;
  }

  public get held(): HeldMove | null {
    return this.current;
  }

  public get notice(): MoveNotice | null {
    return this.told;
  }

  // The row the Move to… picker is open for, if any.
  public get picking(): string | undefined {
    return this.picked;
  }

  // Row `id`'s title, as its owner drew it.
  public titleOf(id: string): string | undefined {
    return this.owner.titles.get(id);
  }

  // Row `id` takes focus through `focus` while it is drawn, as a move lands it; returns what lets it go.
  public registerFocus(id: string, focus: FocusRow): () => void {
    return this.focus.register(id, focus);
  }

  // Opens the Move to… picker for row `id`.
  public pick(id: string): void {
    this.picked = id;
    this.listeners.notify();
  }

  public closePicker(): void {
    this.picked = undefined;
    this.listeners.notify();
  }

  // The owner drew again; a new order lets go of a held move made on the old one.
  public own(owner: MoveOwner): void {
    const rebased = owner.base !== this.owner.base;

    this.owner = owner;

    if (rebased) this.redraw();
  }

  public readonly move = ({ move: next, notice }: ResolvedMove): void => {
    // Before the move, which may draw at once.
    this.focus.after(next.id);
    this.told = nextNotice(this.told, notice);
    this.current = { move: next, base: this.owner.base };
    this.redraw();

    void this.effects
      .report(() => this.owner.onMove(next))
      .then(() => this.effects.frame(() => this.settle(next)));
  };

  public holds(sectionKey: SectionKey): boolean {
    return this.shown.some((section) => section.key === sectionKey);
  }

  // Which steps row `id`'s Move menu offers; none while the List does not hold the row.
  public menuOf(id: string | undefined): MenuSteps | undefined {
    const place = id === undefined ? undefined : placeOf(this.shown, id);

    return place && stepsOf(place.index, place.own.rows.length);
  }

  // Lets go of a move once its answer settles, unless a later move has replaced it.
  private settle(answered: ListMove): void {
    if (this.current?.move !== answered) return;

    this.current = null;
    this.redraw();
  }

  private redraw(): void {
    this.shown = shownSections(this.current, this.owner.base);
    this.listeners.notify();
  }
}

const unsubscribed = (): (() => void) => () => {};

// What a component reads of the order, drawing again only when it changes; nothing outside a List with `onMove`.
export function useMoveOrder<Read>(
  order: MoveOrder | undefined,
  read: (order: MoveOrder) => Read,
): Read | undefined {
  return useSyncExternalStore(order?.subscribe ?? unsubscribed, () =>
    order ? read(order) : undefined,
  );
}
