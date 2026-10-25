import {
  projectDetailsSlotId,
  sessionRowSlotId,
  type WireNode,
} from '@repo/contracts/plugins/wire';
import { expect, it, vi } from 'vitest';
import { prepareSlotTree } from './slot-tree';

const node = (type: string, key: string): WireNode => ({
  type,
  key,
  props: {},
  children: [],
  slots: {},
});

const stack = (...children: WireNode[]): WireNode => ({
  ...node('Stack', 'root'),
  children,
});

it('wraps Session row nodes in a row Stack', () => {
  const prepared = prepareSlotTree(
    sessionRowSlotId,
    stack(node('Label', 'a'), node('Pill', 'c')),
    vi.fn<(type: string) => void>(),
  );

  expect(prepared.type).toBe('Stack');
  expect(prepared.props).toEqual({ direction: 'row' });
  expect(prepared.children.map(({ key }) => key)).toEqual(['a', 'c']);
});

it('refuses parts outside ListItem meta', () => {
  const refused = vi.fn<(type: string) => void>();

  const prepared = prepareSlotTree(
    sessionRowSlotId,
    stack(node('Label', 'a'), node('Button', 'b'), node('Pill', 'c')),
    refused,
  );

  expect(prepared.children.map(({ key }) => key)).toEqual(['a', 'c']);
  expect(refused).toHaveBeenCalledExactlyOnceWith('Button');
});

it('treats a lone non-Stack root as the one meta node', () => {
  const refused = vi.fn<(type: string) => void>();

  const prepared = prepareSlotTree(
    sessionRowSlotId,
    node('Label', 'only'),
    refused,
  );

  expect(prepared.children.map(({ key }) => key)).toEqual(['only']);
  expect(refused).not.toHaveBeenCalled();
});

it('returns the tree untouched for Slots that take any tree', () => {
  const refused = vi.fn<(type: string) => void>();
  const tree = stack(node('Button', 'b'));

  expect(prepareSlotTree(projectDetailsSlotId, tree, refused)).toBe(tree);
  expect(prepareSlotTree('argo/other/v1', tree, refused)).toBe(tree);
  expect(prepareSlotTree(undefined, tree, refused)).toBe(tree);
  expect(refused).not.toHaveBeenCalled();
});
