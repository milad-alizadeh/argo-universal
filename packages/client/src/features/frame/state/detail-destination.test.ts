import { describe, expect, it } from 'vitest';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { detailDestination } from './detail-destination';

const connection: NavigationDestination = { to: 'settings-connection' };

describe('detailDestination', () => {
  it.each<[NavigationDestination, NavigationDestination]>([
    [{ to: 'settings' }, { to: 'settings-accounts' }],
    [{ to: 'sessions' }, { to: 'sessions' }],
    [{ to: 'issues' }, { to: 'issues' }],
    [connection, connection],
  ])('maps %j to %j', (destination, expected) => {
    expect(detailDestination(destination)).toEqual(expected);
  });
});
