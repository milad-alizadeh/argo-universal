import { describe, expect, it } from 'vitest';
import { repairedPluginRoutes } from './plugin-stack-below';

const root = ['lists', 'issues', 'issues'];

const row = [...root, '418'];

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
      repairedPluginRoutes({ routes: [page('page')] }, 'page', {
        path: row,
        root,
      }),
    ).toEqual([
      { key: '[...path]-below', name: '[...path]', params: { path: root } },
      page('page'),
    ]);
  });

  it('leaves the nav item root alone', () => {
    expect(
      repairedPluginRoutes({ routes: [page('page')] }, 'page', {
        path: root,
        root,
      }),
    ).toBeUndefined();
  });

  it('leaves a stack that already has a page below', () => {
    const routes = [page('root'), page('page')];

    expect(
      repairedPluginRoutes({ routes }, 'page', { path: row, root }),
    ).toBeUndefined();
  });

  it('leaves a page of another nav item', () => {
    expect(
      repairedPluginRoutes({ routes: [page('page')] }, 'page', {
        path: ['lists', 'other', 'other', '1'],
        root,
      }),
    ).toBeUndefined();
  });

  it('leaves a stack whose one route is not this page', () => {
    expect(
      repairedPluginRoutes({ routes: [page('other')] }, 'page', {
        path: row,
        root,
      }),
    ).toBeUndefined();
  });
});
