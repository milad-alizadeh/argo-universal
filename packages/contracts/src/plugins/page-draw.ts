import { z } from 'zod';
import { PageAddress } from './page-address';
import type { WireNode } from './wire';

// The most pages of a paged list one address shows.
export const maxPages = 50;

/*
 * One draw the App asks for: the address, how many pages of its paged list it shows, and the hash of the tree it
 * keeps for the address, so an answer that would match it is `unchanged`. `pages` and `known` are not part of the
 * address: two Apps showing one address keep their own page counts.
 */
export const DrawRequest = PageAddress.extend({
  pages: z.number().int().positive().max(maxPages).optional(),
  known: z.string().min(1).optional(),
});

export type DrawRequest = z.infer<typeof DrawRequest>;

/*
 * A draw's answer. `tree` is the whole Plugin tree; `unchanged` says the tree the App keeps is the one it would get;
 * `append` says that tree with `rows` appended to the children of the node `at` walks to, which now has `props`.
 * Each names the hash of the whole tree it leaves the App holding and how many pages its paged list shows.
 */
export type DrawAnswer =
  | ({ kind: 'tree'; root: WireNode } & Drawn)
  | ({ kind: 'unchanged' } & Drawn)
  | ({ kind: 'append'; append: Appended } & Drawn)
  | { kind: 'failed'; error: string };

export type Drawn = { hash: string; pages: number };

// A step from a node to one of its children, or to a node in one of its slots.
export type AppendStep = { slot?: string; index: number };

export type Appended = {
  at: AppendStep[];
  props: WireNode['props'];
  rows: WireNode[];
};
