import type { DraftComment } from '@repo/contracts/operations/plugin-drafts';
import { listenerSet } from '@repo/kit/listener-set';
import { useSyncExternalStore } from 'react';

export type DraftNote = DraftComment & { address: string };

export type DraftPageComments = {
  notes: readonly DraftNote[];
  commenting: boolean;
};

type Page = { pluginId: string; path: string };

const sameNote =
  (note: DraftNote) =>
  (comment: DraftComment): boolean =>
    comment.nodeKey === note.nodeKey &&
    comment.region === note.region &&
    comment.variant === note.variant &&
    comment.note === note.note;

const none: DraftPageComments = { notes: [], commenting: false };

const keyOf = ({ pluginId, path }: Page): string => `${pluginId}\n${path}`;

export const draftCommentsOf = (notes: readonly DraftNote[]): DraftComment[] =>
  notes.map(({ address: _address, ...comment }) => comment);

export class DraftComments {
  private readonly pages = new Map<string, DraftPageComments>();
  private readonly listeners = listenerSet();

  public of(page: Page): DraftPageComments {
    return this.pages.get(keyOf(page)) ?? none;
  }

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

  // The notes that went with a Choose are gone; one left while it was in flight stays. With none named, all are gone.
  public sent(page: Page, comments?: readonly DraftComment[]): void {
    const kept = comments
      ? this.of(page).notes.filter((note) => !comments.some(sameNote(note)))
      : [];

    this.set(page, { ...this.of(page), notes: kept });
  }

  private set(page: Page, next: DraftPageComments): void {
    this.pages.set(keyOf(page), next);

    this.listeners.notify();
  }

  public subscribe = this.listeners.subscribe;
}

export const draftComments = new DraftComments();

export function useDraftComments(page: Page): DraftPageComments {
  return useSyncExternalStore(draftComments.subscribe, () =>
    draftComments.of(page),
  );
}
