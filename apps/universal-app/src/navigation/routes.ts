import type { NavigationDestination } from '@repo/client';
import { hrefFor as destinationHref } from '@repo/client/navigation';
import type { Href } from 'expo-router';
export { destinationFor } from '@repo/client/navigation';

export function hrefFor(destination: NavigationDestination): Href {
  return destinationHref(destination);
}

// New Session's Project is the one param a screen changed in place could keep showing.
const leftBehind = { projectId: undefined };

// The params a destination sets on the screen already showing its route, clearing any it leaves out.
export function paramsOf(
  destination: NavigationDestination,
): Record<string, string | undefined> {
  const { params } = destinationHref(destination);
  return { ...leftBehind, ...params };
}
