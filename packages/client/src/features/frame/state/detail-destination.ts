import type { NavigationDestination } from '#lib/product/navigation/context';

// What a wide window's detail pane shows for a destination: Settings opens on Accounts beside its list.
export function detailDestination(
  destination: NavigationDestination,
): NavigationDestination {
  return destination.to === 'settings'
    ? { to: 'settings-accounts' }
    : destination;
}
