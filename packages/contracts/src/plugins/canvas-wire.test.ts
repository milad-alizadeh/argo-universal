import { expect, it } from 'vitest';
import { currentPartVersions } from './kit';
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

it('reports Canvas and every shape to Apps that can draw them', () => {
  expect(currentPartVersions).toMatchObject({
    Canvas: 1,
    'Canvas.Rect': 1,
    'Canvas.Circle': 1,
    'Canvas.Line': 1,
    'Canvas.Path': 1,
    'Canvas.Text': 1,
    'Canvas.Group': 1,
  });
  expect(prepareWireTree(scene, currentPartVersions)).toEqual(scene);
});

it('shows the update fallback when an App cannot draw Canvas', () => {
  const result = prepareWireTree(scene, { Text: 3 });
  expect(result).toMatchObject({
    type: 'Text',
    props: { children: 'Update Argo to see this' },
    children: [],
  });
});

it('keeps selection as a Canvas prop without changing its keyed children', () => {
  const selected = { ...scene, props: { ...scene.props, selectedKey: 'day' } };
  expect(prepareWireTree(selected, currentPartVersions)).toEqual(selected);
});
