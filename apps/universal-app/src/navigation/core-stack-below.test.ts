import { describe, expect, it } from 'vitest';
import { repairedCoreRoutes } from './core-stack-below';

const list = 'projects/index';

const pageName = 'projects/[name]';

const routeNames = ['index', list, pageName, 'connection'];

const root = { key: 'root', name: 'index' };

const page = { key: 'page', name: pageName, params: { name: 'proj' } };

describe('repairedCoreRoutes', () => {
  it('puts the list between the root and a page delivered to a running App, whose root has no params', () => {
    const routes = [root, page];

    expect(
      repairedCoreRoutes({ routes, routeNames }, 'page')?.map((r) => r.name),
    ).toEqual(['index', list, pageName]);
  });

  it('drops the params a cold start seeded the root with', () => {
    const routes = [
      { key: 'root', name: 'index', params: { name: 'proj' } },
      page,
    ];

    expect(repairedCoreRoutes({ routes, routeNames }, 'page')?.[0]).toEqual({
      key: 'root',
      name: 'index',
    });
  });

  it('leaves a stack that already has the list', () => {
    const routes = [root, { key: 'list', name: list }, page];

    expect(repairedCoreRoutes({ routes, routeNames }, 'page')).toBeUndefined();
  });

  it('leaves a list opened over the root, as a wide window does', () => {
    const routes = [root, { key: 'list', name: list }];

    expect(repairedCoreRoutes({ routes, routeNames }, 'list')).toBeUndefined();
  });

  it('leaves another page than the one asking', () => {
    const routes = [root, page];

    expect(repairedCoreRoutes({ routes, routeNames }, 'other')).toBeUndefined();
  });
});
