import { describe, expect, it } from 'vitest';
import { repairedPluginRoutes } from './plugin-stack-below';

const root = ['lists', 'issues', 'issues'];

const row = [...root, '418'];

const narrow = { path: row, root, wide: false };

interface TestRoute {
  key: string;
  name: string;
}

const page = (key: string): TestRoute => ({
  key,
  name: '[...path]',
});

describe('repairedPluginRoutes', () => {
  it('puts the nav item root below a row page that is the whole stack', () => {
    expect(
      repairedPluginRoutes({ routes: [page('page')] }, 'page', narrow),
    ).toEqual([
      { key: '[...path]-below', name: '[...path]', params: { path: root } },
      page('page'),
    ]);
  });

  it('leaves the nav item root alone', () => {
    expect(
      repairedPluginRoutes({ routes: [page('page')] }, 'page', {
        ...narrow,
        path: root,
      }),
    ).toBeUndefined();
  });

  it('leaves a stack that already has a page below', () => {
    const routes = [page('root'), page('page')];

    expect(repairedPluginRoutes({ routes }, 'page', narrow)).toBeUndefined();
  });

  it('leaves a page of another nav item', () => {
    expect(
      repairedPluginRoutes({ routes: [page('page')] }, 'page', {
        ...narrow,
        path: ['lists', 'other', 'other', '1'],
      }),
    ).toBeUndefined();
  });

  it('leaves a stack whose one route is not this page', () => {
    expect(
      repairedPluginRoutes({ routes: [page('other')] }, 'page', narrow),
    ).toBeUndefined();
  });

  it('puts nothing below a page on a wide window', () => {
    expect(
      repairedPluginRoutes({ routes: [page('page')] }, 'page', {
        ...narrow,
        wide: true,
      }),
    ).toBeUndefined();
  });

  it('takes the root it put below back out when the window grows wide', () => {
    expect(
      repairedPluginRoutes(
        { routes: [page('[...path]-below'), page('page')] },
        'page',
        { ...narrow, wide: true },
      ),
    ).toEqual([page('page')]);
  });

  it('keeps a page really pushed from the root when the window grows wide', () => {
    const routes = [page('root'), page('page')];

    expect(
      repairedPluginRoutes({ routes }, 'page', { ...narrow, wide: true }),
    ).toBeUndefined();
  });
});
