import { expect, it } from 'vitest';
import type { DraftBarModel } from './draft-bar-model';
import { draftFrameOf } from './draft-frame';

const bar = (
  current: DraftBarModel['current'],
  missing: boolean,
): DraftBarModel => ({
  states: [
    { id: 'empty', label: 'Empty', missing },
    { id: 'populated', label: 'Populated', missing: false },
  ],
  current,
  regions: [],
});

const loaderThrew = 'Loader threw';

const notDeclared = 'not declared';

const textOf = (frame: ReturnType<typeof draftFrameOf>): string =>
  JSON.stringify(frame?.props.children);

it('draws no frame for a page that is not a Draft', () => {
  expect(draftFrameOf(null, loaderThrew)).toBeNull();
});

it('draws no frame for a state the Draft draws', () => {
  expect(draftFrameOf(bar('populated', false), null)).toBeNull();
});

it('says why a state the Draft does not declare draws nothing', () => {
  const text = textOf(draftFrameOf(bar('empty', true), null));

  expect(text).toEqual(expect.stringContaining('Empty'));
  expect(text).toEqual(expect.stringContaining(notDeclared));
});

it('says why a state whose Loader failed draws nothing, with the Loader error', () => {
  const text = textOf(draftFrameOf(bar('populated', false), 'No issues field'));

  expect(text).toEqual(expect.stringContaining('Populated'));
  expect(text).toEqual(expect.stringContaining('No issues field'));
});

it('names the missing state before a failure the Loader may have for it', () => {
  const text = textOf(draftFrameOf(bar('empty', true), loaderThrew));

  expect(text).toEqual(expect.stringContaining(notDeclared));
  expect(text).not.toEqual(expect.stringContaining(loaderThrew));
});
