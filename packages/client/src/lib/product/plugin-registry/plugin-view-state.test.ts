import {
  counterSnapshot,
  counterTapPatch,
  counterTappedRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { expect, it } from 'vitest';
import { emptyPluginView, reducePluginView } from './plugin-view-state';

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
