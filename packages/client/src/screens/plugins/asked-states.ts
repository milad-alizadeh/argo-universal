import type { PageState } from '@repo/contracts/plugins/page-address';

/*
 * The Page state last asked for each opening. A change merges into it, so two in flight keep both, and only
 * the one asked last is shown once drawn, whichever draw lands last.
 */
export class AskedStates {
  private readonly states = new Map<string, PageState>();

  // The state a change makes on the last one asked for the opening, or on `shown` when none is.
  public next(key: string, shown: PageState, change: PageState): PageState {
    const next = { ...(this.states.get(key) ?? shown), ...change };

    this.states.set(key, next);

    return next;
  }

  // Whether `state` is the one asked last; if so it is no longer asked.
  public landed(key: string, state: PageState): boolean {
    const last = this.states.get(key) === state;

    if (last) this.states.delete(key);

    return last;
  }
}
