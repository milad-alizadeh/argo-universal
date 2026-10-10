import { describe, expect, it } from 'vitest';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { detailDestination } from './detail-destination';

describe('detailDestination', () => {
  it.each<[NavigationDestination, NavigationDestination]>([
    [{ to: 'settings' }, { to: 'settings-accounts' }],
    [{ to: 'sessions' }, { to: 'sessions' }],
    [{ to: 'issues' }, { to: 'issues' }],
    [{ to: 'settings-connection' }, { to: 'settings-connection' }],
  ])('maps %j to %j', (destination, expected) => {
    expect(detailDestination(destination)).toEqual(expected);
  });
});
