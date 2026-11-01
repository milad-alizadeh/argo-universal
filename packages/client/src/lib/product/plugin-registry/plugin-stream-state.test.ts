import {
  messageSlotFixture,
  rewrittenMessage,
} from '@repo/contracts/plugins/replaceable-fixtures';
import {
  counterRoot,
  counterSnapshot,
  counterTapPatch,
  counterTappedRoot,
  waveCounterRoot,
  waveCounterSnapshot,
  waveCounterTree,
  waveCounterWavePatch,
} from '@repo/contracts/plugins/wire-fixtures';
import { describe, expect, it } from 'vitest';
import {
  coreSlotState,
  emptyPluginView,
  reducePluginView,
  reduceReplaceable,
} from './plugin-stream-state';

describe('reducePluginView', () => {
  const shown = reducePluginView(emptyPluginView, counterSnapshot);

  it('shows a snapshot', () => {
    expect(shown).toEqual({ root: counterRoot, revision: 1, viewId: null });
  });

  it('applies the next revision', () => {
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

// A Replaceable Slot's replacement names the Plugin page it was drawn from.
const path = '/wave';

const replacement = (message = waveCounterSnapshot) =>
  ({ type: 'replacement', pluginId: 'example', path, message }) as const;

describe('reduceReplaceable', () => {
  const core = coreSlotState(messageSlotFixture);

  it('draws a replacement from its snapshot', () => {
    expect(reduceReplaceable(core, replacement())).toEqual({
      input: messageSlotFixture,
      replacement: {
        pluginId: 'example',
        path,
        view: { root: waveCounterRoot, revision: 1, viewId: null },
      },
    });
  });

  it('redraws a replacement from its patch', () => {
    const drawn = reduceReplaceable(core, replacement());

    expect(reduceReplaceable(drawn, replacement(waveCounterWavePatch))).toEqual(
      {
        input: messageSlotFixture,
        replacement: {
          pluginId: 'example',
          path,
          view: { root: waveCounterTree('argo', 1), revision: 2, viewId: null },
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
