import { describe, expect, it } from 'vitest';
import { reachableRoutes } from './reachable-routes';

describe('the routes a phone can reach', () => {
  it('reaches only Pairing while it holds no Server', () => {
    expect(reachableRoutes({ showsServer: false, pairLink: false })).toEqual([
      'pair',
    ]);
  });

  it('reaches the App, and not Pairing, once it holds a Server', () => {
    const routes = reachableRoutes({ showsServer: true, pairLink: false });

    expect(routes).toEqual(['(frame)', 'screen/[id]', 'open/[...link]']);
  });

  it('reaches Pairing beside the App when a build carries the code in its link', () => {
    const routes = reachableRoutes({ showsServer: true, pairLink: true });

    expect(routes).toContain('pair');
    expect(routes).toContain('(frame)');
  });
});
