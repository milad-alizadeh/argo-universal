import type { WireNode } from '@repo/contracts/plugins/wire';
import { childNodeKey } from '@repo/contracts/plugins/wire-node-key';
import { expect, it } from 'vitest';
import { startDrawing, drawn } from './draft-drawing';

const node = (
  key: string,
  children: WireNode[] = [],
  type = 'Stack',
): WireNode => ({ type, key, props: {}, children, slots: {} });

// A node's address is its keys from the root, as the registry draws it.
const address = (...keys: string[]): string =>
  keys.reduce((parent, key) => childNodeKey(parent, key), '');

const skeleton = (): WireNode =>
  node('page', [node('header', [node('header-bar')]), node('list')]);

const headerLanded = (kept: WireNode): WireNode => ({
  ...kept,
  children: [
    node('header', [node('header-bar'), node('title', [], 'Text')]),
    ...kept.children.slice(1),
  ],
});

const listLanded = (kept: WireNode): WireNode => ({
  ...kept,
  children: [
    ...kept.children.slice(0, 1),
    node('list', [node('row-1'), node('row-2')]),
  ],
});

it('fades nothing in for the first tree it sees', () => {
  const state = drawn(startDrawing(null), skeleton(), null);

  expect([...state.fresh]).toEqual([]);
});

it('fades in only the topmost nodes whose keys are new since the kept tree', () => {
  const kept = skeleton();
  const first = drawn(startDrawing(null), kept, null);
  const next = drawn(first, listLanded(kept), null);

  expect([...next.fresh]).toEqual([
    address('page', 'list', 'row-1'),
    address('page', 'list', 'row-2'),
  ]);
});

it('leaves unchanged keys out of the fade, even after a redraw of the same tree', () => {
  const kept = skeleton();
  const first = drawn(startDrawing(null), kept, null);
  const next = drawn(first, listLanded(kept), null);
  const again = drawn(next, { ...listLanded(kept) }, null);

  expect([...again.fresh]).toEqual([]);
});

it('keeps wrapping a node that faded in, so its drawing keeps its identity', () => {
  const kept = skeleton();
  const first = drawn(startDrawing(null), kept, null);
  const next = drawn(first, listLanded(kept), null);
  const again = drawn(next, { ...listLanded(kept) }, null);

  expect([...again.faded]).toEqual([
    address('page', 'list', 'row-1'),
    address('page', 'list', 'row-2'),
  ]);
});

it('returns the same state for a tree it already saw', () => {
  const kept = skeleton();
  const first = drawn(startDrawing(null), kept, null);

  expect(drawn(first, kept, null)).toBe(first);
});

it('frames the region named, from the tree that follows the naming', () => {
  const kept = skeleton();
  const first = drawn(startDrawing(null), kept, null);
  const named = drawn(first, kept, { region: 'header', serial: 1 });

  expect([...named.framed]).toEqual([]);

  const next = drawn(named, { ...kept }, { region: 'header', serial: 1 });

  expect([...next.framed]).toEqual(['header']);
});

it('dissolves the frame once new keys land inside its region', () => {
  const kept = skeleton();
  const naming = { region: 'header', serial: 1 };
  const first = drawn(startDrawing(null), kept, naming);
  const framed = drawn(first, { ...kept }, naming);
  const landed = drawn(framed, headerLanded(kept), naming);

  expect([...landed.framed]).toEqual([]);
  expect([...landed.fresh]).toEqual([address('page', 'header', 'title')]);
});

it('moves the frame to the next region as the last one lands', () => {
  const kept = skeleton();
  const header = { region: 'header', serial: 1 };
  const list = { region: 'list', serial: 2 };
  const first = drawn(startDrawing(null), kept, header);
  const framed = drawn(first, { ...kept }, header);
  const named = drawn(framed, { ...kept }, list);
  const landed = drawn(named, headerLanded(kept), list);

  expect([...landed.framed]).toEqual(['list']);
});

it('does not frame for a naming it had when it started', () => {
  const old = { region: 'header', serial: 4 };
  const first = drawn(startDrawing(old), skeleton(), old);
  const next = drawn(first, { ...skeleton() }, old);

  expect([...next.framed]).toEqual([]);
});

it('remembers each region it framed, so its wrapper stays for the tree', () => {
  const kept = skeleton();
  const naming = { region: 'header', serial: 1 };
  const first = drawn(startDrawing(null), kept, naming);
  const framed = drawn(first, { ...kept }, naming);
  const landed = drawn(framed, headerLanded(kept), naming);

  expect([...landed.regions]).toEqual(['header']);
});
