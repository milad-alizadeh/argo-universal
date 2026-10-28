import { applyListMove, type ListMove } from '@repo/contracts/kit-moves';
import { useSyncExternalStore } from 'react';
import { listenerSet } from '../../../listener-set';
import { RowFocus, type MoveNotice } from './list-move-feedback';
import {
  placeOf,
  type MoveSection,
  type ResolvedMove,
} from './list-move-model';

// A Plugin's `onMove` answers once its dispatch settles; an App owner's answers at once.
export type MoveAnswer = (move: ListMove) => void | Promise<void>;

// What the List's owner last drew: its order, its answer to a move, and whether its Sections draw as lanes.
export interface MoveOwner {
  base: readonly MoveSection[];
  onMove: MoveAnswer;
  lanes: boolean;
}

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

// Names every Section a row can move to, so a row's menu draws again only when one is added, removed or renamed.
const targetsOf = (sections: readonly MoveSection[]): string =>
  sections
    .map(
      (section) => `${section.key}=${section.id ?? ''}:${section.title ?? ''}`,
    )
    .join('|');

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
  public readonly focus: RowFocus;
  private shown: readonly MoveSection[];
  private targets: string;
  private current: HeldMove | null = null;
  private told: MoveNotice | null = null;

  public constructor(
    private owner: MoveOwner,
    private readonly effects: MoveEffects,
  ) {
    this.focus = new RowFocus(effects.frame);
    this.shown = owner.base;
    this.targets = targetsOf(owner.base);
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

  public holds(sectionKey: string): boolean {
    return this.shown.some((section) => section.key === sectionKey);
  }

  // What row `id`'s Move menu shows: where it sits, how long its Section is, and every Section it can move to.
  public menuOf(id: string | undefined): string | undefined {
    const place = id === undefined ? undefined : placeOf(this.shown, id);

    return (
      place &&
      `${place.sectionKey}:${place.index}/${place.own.rows.length}|${this.targets}`
    );
  }

  // Lets go of a move once its answer settles, unless a later move has replaced it.
  private settle(answered: ListMove): void {
    if (this.current?.move !== answered) return;

    this.current = null;
    this.redraw();
  }

  private redraw(): void {
    this.shown = shownSections(this.current, this.owner.base);
    this.targets = targetsOf(this.shown);
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
