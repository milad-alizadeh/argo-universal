import {
  counterRoot,
  counterSnapshot,
  counterTapPatch,
  counterTappedRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { describe, expect, it } from 'vitest';
import { emptyPluginView, reducePluginView } from './plugin-stream-state';

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
