import {
  helloSlotRoot,
  helloSlotSnapshot,
  helloSlotTree,
  helloSlotWavePatch,
} from '@repo/contracts/plugins/wire-fixtures';
import { describe, expect, it } from 'vitest';
import { reducePluginSlot } from './plugin-slot-state';

const path = 'slot:argo/project/details/v1:{"projectId":"argo"}';

const view = (pluginId: string, message = helloSlotSnapshot) =>
  ({ type: 'view', pluginId, path, message }) as const;

describe('reducePluginSlot', () => {
  it('lists the contributors in the order the Server sends, each blank until its snapshot', () => {
    expect(
      reducePluginSlot([], { type: 'contributors', pluginIds: ['a', 'b'] }),
    ).toEqual([
      {
        pluginId: 'a',
        path: null,
        view: { root: null, revision: 0, viewId: null },
      },
      {
        pluginId: 'b',
        path: null,
        view: { root: null, revision: 0, viewId: null },
      },
    ]);
  });

  it('draws a contributor from its snapshot, then its patches', () => {
    const listed = reducePluginSlot([], {
      type: 'contributors',
      pluginIds: ['hello'],
    });

    const drawn = reducePluginSlot(listed, view('hello'));
    const patched = reducePluginSlot(drawn, view('hello', helloSlotWavePatch));

    expect(drawn).toEqual([
      {
        pluginId: 'hello',
        path,
        view: { root: helloSlotRoot, revision: 1, viewId: null },
      },
    ]);
    expect(patched).toEqual([
      {
        pluginId: 'hello',
        path,
        view: { root: helloSlotTree('argo', 1), revision: 2, viewId: null },
      },
    ]);
  });

  it('ignores a view from a Plugin the Server did not list', () => {
    expect(reducePluginSlot([], view('stranger'))).toEqual([]);
  });

  it('keeps what a contributor drew when a reconnect lists it again', () => {
    const drawn = reducePluginSlot(
      reducePluginSlot([], { type: 'contributors', pluginIds: ['hello'] }),
      view('hello'),
    );

    expect(
      reducePluginSlot(drawn, {
        type: 'contributors',
        pluginIds: ['hello', 'other'],
      }),
    ).toEqual([
      drawn[0],
      {
        pluginId: 'other',
        path: null,
        view: { root: null, revision: 0, viewId: null },
      },
    ]);
  });
});
