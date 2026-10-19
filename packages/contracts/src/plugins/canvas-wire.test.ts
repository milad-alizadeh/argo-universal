import { expect, it } from 'vitest';
import { prepareWireTree } from './prepare-tree';
import type { WireNode } from './wire';

const scene: WireNode = {
  type: 'Canvas',
  key: 'scene',
  props: { label: 'Build activity', width: 360, height: 216, camera: 'fixed' },
  children: [
    {
      type: 'Canvas.Rect',
      key: 'day',
      props: { width: 25, height: 25, tone: 'accent', intensity: 0.5 },
      children: [],
      slots: {},
    },
  ],
  slots: {},
};

it('preserves Canvas and its keyed drawing data', () => {
  expect(prepareWireTree(scene)).toEqual(scene);
});

it('keeps selection as a Canvas prop without changing its keyed children', () => {
  const selected = { ...scene, props: { ...scene.props, selectedKey: 'day' } };
  expect(prepareWireTree(selected)).toEqual(selected);
});
