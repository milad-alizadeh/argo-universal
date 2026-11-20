import type { OpenPage, WireNode } from '@argo/plugin-kit/testing';
import { at, text } from '../json';

/*
 * A card's power Toggle or brightness Slider, found by the Hue id its Operation names, as the person finds the
 * control on the card of that light or room.
 */
type Control = 'FieldGroup.Toggle' | 'FieldGroup.Slider';

type Match = (node: WireNode) => boolean;

const targetOf = (node: WireNode): string | null =>
  text(at(node.props.onValueChange, 'args', 'id'));

const control =
  (type: Control, id: string): Match =>
  (node) =>
    node.type === type && targetOf(node) === id;

export const toggleOf = (id: string): Match => control('FieldGroup.Toggle', id);

export const sliderOf = (id: string): Match => control('FieldGroup.Slider', id);

// What a control shows now: a Toggle's on, a Slider's number.
export const shown = (page: OpenPage, match: Match): string =>
  JSON.stringify(page.find(match).props.value);
