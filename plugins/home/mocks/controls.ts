import type { OpenPage, WireNode } from '@argo/plugin-kit/testing';
import { at, text } from '../json';

type Match = (node: WireNode) => boolean;

const targetOf = (node: WireNode, event: string): string | null =>
  text(at(node.props[event], 'args', 'id'));

export const toggleOf =
  (id: string): Match =>
  (node) =>
    node.type === 'IconButton' && targetOf(node, 'onPress') === id;

export const sliderOf =
  (id: string): Match =>
  (node) =>
    node.type === 'Fader' && targetOf(node, 'onValueChange') === id;

export const shown = (page: OpenPage, match: Match): string => {
  const node = page.find(match);

  return JSON.stringify(
    node.type === 'IconButton' ? node.props.selected : node.props.value,
  );
};
