import { useSyncExternalStore } from 'react';
import { listenerSet } from '../../../listener-set';
import { placeOf, type MoveSection } from './list-move-model';

// Names every Section a row can move to, so a row's menu draws again only when one is added, removed or renamed.
const targetsOf = (sections: readonly MoveSection[]): string =>
  sections
    .map(
      (section) => `${section.key}=${section.id ?? ''}:${section.title ?? ''}`,
    )
    .join('|');

/*
 * The order a List with `onMove` shows, as an external store: each move changes it, and a row, zone or lane reads only
 * the part it draws, so a move redraws the rows whose menu changes rather than every row.
 */
export class MoveOrder {
  private readonly listeners = listenerSet();
  public readonly subscribe = this.listeners.subscribe;
  private targets: string;

  public constructor(private shown: readonly MoveSection[]) {
    this.targets = targetsOf(shown);
  }

  public get sections(): readonly MoveSection[] {
    return this.shown;
  }

  public show(sections: readonly MoveSection[]): void {
    if (sections === this.shown) return;

    this.shown = sections;
    this.targets = targetsOf(sections);
    this.listeners.notify();
  }

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
