import type { PluginManifest } from '@repo/contracts/plugins';
import { expect, it } from 'vitest';
import {
  draftBarOf,
  draftFrameOf,
  draftPageOf,
  type DraftBarModel,
  type DraftEntry,
} from './draft-bar-model';

const manifestWith = (
  drafts?: NonNullable<PluginManifest['contributes']['drafts']>,
): DraftEntry['manifest'] => ({ contributes: { ...(drafts && { drafts }) } });

const issues = (dev?: boolean): DraftEntry => ({
  ...(dev !== undefined && { dev }),
  manifest: manifestWith([
    { page: '/', states: ['populated', 'loading', 'error'] },
  ]),
});

it('shows a dev Plugin Draft page with every minimum state, the undeclared ones missing', () => {
  const bar = draftBarOf(issues(true), '/', {});

  expect(bar?.states).toEqual([
    { id: 'loading', label: 'Loading', missing: false },
    { id: 'empty', label: 'Empty', missing: true },
    { id: 'error', label: 'Error', missing: false },
    { id: 'signed-out', label: 'Signed out', missing: true },
    { id: 'pending', label: 'Pending', missing: true },
    { id: 'populated', label: 'Populated', missing: false },
  ]);
});

it.each([
  ['a Plugin the Server does not call dev', issues(), '/'],
  ['a Plugin the Server calls not dev', issues(false), '/'],
  ['a page the Plugin does not declare as a Draft', issues(true), '/other'],
  [
    'a Plugin that declares no Drafts',
    { dev: true, manifest: manifestWith() },
    '/',
  ],
])('draws no bar for %s', (_name, entry, path) => {
  expect(draftBarOf(entry, path, {})).toBeNull();
});

it('draws no bar for a Plugin the list has not answered for', () => {
  expect(draftBarOf(null, '/', {})).toBeNull();
});

it('reads the current state from the Page state', () => {
  expect(draftBarOf(issues(true), '/', { draftState: 'error' })?.current).toBe(
    'error',
  );
});

it('rests on populated until a state is chosen', () => {
  expect(draftBarOf(issues(true), '/', {})?.current).toBe('populated');
});

it('rests on the first declared state when populated is not declared', () => {
  const entry: DraftEntry = {
    dev: true,
    manifest: manifestWith([{ page: '/', states: ['empty', 'loading'] }]),
  };

  expect(draftBarOf(entry, '/', {})?.current).toBe('loading');
});

it('keeps a chosen state the Draft does not declare, marked missing, so the page can say why it draws nothing', () => {
  const bar = draftBarOf(issues(true), '/', { draftState: 'empty' });

  expect(bar?.current).toBe('empty');
  expect(bar?.states.find(({ id }) => id === bar.current)?.missing).toBe(true);
});

it('ignores a chosen state that is not a minimum state', () => {
  expect(draftBarOf(issues(true), '/', { draftState: 'sleepy' })?.current).toBe(
    'populated',
  );
});

it('lists the regions the Draft page declares, for the page to frame', () => {
  const entry: DraftEntry = {
    dev: true,
    manifest: manifestWith([
      {
        page: '/',
        states: ['populated'],
        regions: [
          { id: 'header', variants: [{ id: 'a', name: 'A' }] },
          { id: 'list', variants: [{ id: 'a', name: 'A' }] },
        ],
      },
    ]),
  };

  expect(draftBarOf(entry, '/', {})?.regions).toEqual(['header', 'list']);
  expect(draftBarOf(issues(true), '/', {})?.regions).toEqual([]);
});

it('finds a Draft page only in a dev Plugin, at a path the page matches', () => {
  expect(draftPageOf(issues(true), '/')?.page).toBe('/');
  expect(draftPageOf(issues(false), '/')).toBeNull();
  expect(draftPageOf(issues(), '/')).toBeNull();
  expect(draftPageOf(issues(true), '/other')).toBeNull();
  expect(draftPageOf(null, '/')).toBeNull();
});

const frameBar = (
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
  expect(draftFrameOf(frameBar('populated', false), null)).toBeNull();
});

it('says why a state the Draft does not declare draws nothing', () => {
  const text = textOf(draftFrameOf(frameBar('empty', true), null));

  expect(text).toEqual(expect.stringContaining('Empty'));
  expect(text).toEqual(expect.stringContaining(notDeclared));
});

it('says why a state whose Loader failed draws nothing, with the Loader error', () => {
  const text = textOf(
    draftFrameOf(frameBar('populated', false), 'No issues field'),
  );

  expect(text).toEqual(expect.stringContaining('Populated'));
  expect(text).toEqual(expect.stringContaining('No issues field'));
});

it('names the missing state before a failure the Loader may have for it', () => {
  const text = textOf(draftFrameOf(frameBar('empty', true), loaderThrew));

  expect(text).toEqual(expect.stringContaining(notDeclared));
  expect(text).not.toEqual(expect.stringContaining(loaderThrew));
});
