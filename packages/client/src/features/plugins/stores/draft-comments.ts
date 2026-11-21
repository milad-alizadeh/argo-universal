import type { DraftComment } from '@repo/contracts/operations/plugin-drafts';
import { useSyncExternalStore } from 'react';

// A note on one node of a Draft page, by the node's address in the tree, so its pin finds it again.
export type DraftNote = DraftComment & { address: string };

export type DraftPageComments = {
  notes: readonly DraftNote[];
  // Whether the author is picking nodes to comment on.
  commenting: boolean;
};

type Page = { pluginId: string; path: string };

const none: DraftPageComments = { notes: [], commenting: false };

const keyOf = ({ pluginId, path }: Page): string => `${pluginId}\n${path}`;

// What Choose sends of the notes: the node, and the region and Variant it sits in, without the pin's address.
export const draftCommentsOf = (notes: readonly DraftNote[]): DraftComment[] =>
  notes.map(({ address: _address, ...comment }) => comment);

/*
 * The notes an author has left on each Draft page, and whether this App is in comment mode there. Kept in memory
 * as the Page state is: each App holds its own, and Choose sends and clears them (ADR-0057).
 */
export class DraftComments {
  private readonly pages = new Map<string, DraftPageComments>();
  private readonly listeners = new Set<() => void>();

  public of(page: Page): DraftPageComments {
    return this.pages.get(keyOf(page)) ?? none;
  }

  // A note on a node that already has one replaces it; a blank note removes it.
  public save(page: Page, note: DraftNote): void {
    const { notes, commenting } = this.of(page);
    const others = notes.filter(({ address }) => address !== note.address);

    this.set(page, {
      commenting,
      notes: note.note.trim() === '' ? others : [...others, note],
    });
  }

  public setCommenting(page: Page, commenting: boolean): void {
    this.set(page, { ...this.of(page), commenting });
  }

  // The notes went with a Choose.
  public sent(page: Page): void {
    this.set(page, { ...this.of(page), notes: [] });
  }

  private set(page: Page, next: DraftPageComments): void {
    this.pages.set(keyOf(page), next);

    for (const listener of this.listeners) listener();
  }

  // The answer unsubscribes.
  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  };
}

export const draftComments = new DraftComments();

export function useDraftComments(page: Page): DraftPageComments {
  return useSyncExternalStore(draftComments.subscribe, () =>
    draftComments.of(page),
  );
}
