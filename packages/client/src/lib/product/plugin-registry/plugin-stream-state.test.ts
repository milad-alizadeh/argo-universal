import {
  messageSlotFixture,
  rewrittenMessage,
} from '@repo/contracts/plugins/replaceable-fixtures';
import {
  counterSnapshot,
  counterTapPatch,
  counterTappedRoot,
  slotCounterRoot,
  slotCounterSnapshot,
  slotCounterTree,
  slotCounterWavePatch,
} from '@repo/contracts/plugins/wire-fixtures';
import { describe, expect, it } from 'vitest';
import {
  coreSlotState,
  emptyPluginView,
  reducePluginSlot,
  reducePluginView,
  reduceReplaceable,
} from './plugin-stream-state';

describe('reducePluginView', () => {
  const shown = reducePluginView(emptyPluginView, counterSnapshot);

  it('shows a snapshot, then applies the next revision', () => {
    expect(reducePluginView(shown, counterTapPatch)).toEqual({
      root: counterTappedRoot,
      revision: 2,
      viewId: null,
    });
  });

  it('drops a patch that is not newer than what it shows', () => {
    const tapped = reducePluginView(shown, counterTapPatch);

    expect(reducePluginView(tapped, counterTapPatch)).toBe(tapped);
  });

  it('ignores a patch before any snapshot', () => {
    expect(reducePluginView(emptyPluginView, counterTapPatch)).toBe(
      emptyPluginView,
    );
  });

  it('replaces the page with a fresh snapshot even when its revision is lower', () => {
    const tapped = reducePluginView(shown, counterTapPatch);

    expect(reducePluginView(tapped, counterSnapshot)).toEqual(shown);
  });
});

const path = 'slot:argo/project/details/v1:{"projectId":"argo"}';

const view = (pluginId: string, message = slotCounterSnapshot) =>
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

    const patched = reducePluginSlot(
      drawn,
      view('hello', slotCounterWavePatch),
    );

    expect(drawn).toEqual([
      {
        pluginId: 'hello',
        path,
        view: { root: slotCounterRoot, revision: 1, viewId: null },
      },
    ]);
    expect(patched).toEqual([
      {
        pluginId: 'hello',
        path,
        view: { root: slotCounterTree('argo', 1), revision: 2, viewId: null },
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

const replacement = (message = slotCounterSnapshot) =>
  ({ type: 'replacement', pluginId: 'hello', path, message }) as const;

describe('reduceReplaceable', () => {
  const core = coreSlotState(messageSlotFixture);

  it('draws a replacement from its snapshot, then its patches', () => {
    const drawn = reduceReplaceable(core, replacement());

    expect(reduceReplaceable(drawn, replacement(slotCounterWavePatch))).toEqual(
      {
        input: messageSlotFixture,
        replacement: {
          pluginId: 'hello',
          path,
          view: { root: slotCounterTree('argo', 1), revision: 2, viewId: null },
        },
      },
    );
  });

  it('hands the Slot back to core with the props the Plugin passed on', () => {
    const drawn = reduceReplaceable(core, replacement());

    expect(
      reduceReplaceable(drawn, { type: 'core', input: rewrittenMessage() }),
    ).toEqual(coreSlotState(rewrittenMessage()));
  });
});
