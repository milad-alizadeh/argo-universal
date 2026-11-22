import { expect, it } from 'vitest';
import { pressEventOf } from './kit-presses';

const back = { operation: 'setPower' };

it.each([
  {
    props: { selected: true, onPressSelected: back },
    event: 'onPressSelected',
  },
  { props: { selected: false, onPressSelected: back }, event: 'onPress' },
  { props: { selected: null, onPressSelected: back }, event: 'onPress' },
  { props: { selected: true }, event: 'onPress' },
  { props: {}, event: 'onPress' },
])('presses $event for $props', ({ props, event }) => {
  expect(pressEventOf(props)).toBe(event);
});
