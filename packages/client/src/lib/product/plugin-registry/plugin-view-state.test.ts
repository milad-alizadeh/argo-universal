import {
  helloSnapshot,
  helloTapPatch,
  helloTappedRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { expect, it } from 'vitest';
import { emptyPluginView, reducePluginView } from './plugin-view-state';

const shown = reducePluginView(emptyPluginView, helloSnapshot);

it('shows a snapshot, then applies the next revision', () => {
  expect(reducePluginView(shown, helloTapPatch)).toEqual({
    root: helloTappedRoot,
    revision: 2,
    viewId: null,
  });
});

it('drops a patch that is not newer than what it shows', () => {
  const tapped = reducePluginView(shown, helloTapPatch);

  expect(reducePluginView(tapped, helloTapPatch)).toBe(tapped);
});

it('ignores a patch before any snapshot', () => {
  expect(reducePluginView(emptyPluginView, helloTapPatch)).toBe(
    emptyPluginView,
  );
});

it('replaces the page with a fresh snapshot even when its revision is lower', () => {
  const tapped = reducePluginView(shown, helloTapPatch);

  expect(reducePluginView(tapped, helloSnapshot)).toEqual(shown);
});
