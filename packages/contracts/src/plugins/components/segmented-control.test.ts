import { expect, it } from 'vitest';
import { prepareWireTree } from '../prepare-tree';
import type { WireNode } from '../wire';

const control: WireNode = {
  type: 'SegmentedControl',
  key: 'views',
  props: {
    label: 'Views',
    value: 'open',
    options: [
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
    ],
    onValueChange: { $event: 'onValueChange' },
  },
  children: [],
  slots: {},
};

it('accepts a segmented view switcher on the Plugin wire', () => {
  expect(prepareWireTree(control)).toEqual(control);
});
