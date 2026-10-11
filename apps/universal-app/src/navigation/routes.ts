import type { NavigationDestination } from '@repo/client';
import { hrefFor as destinationHref } from '@repo/client/navigation';
import type { Href } from 'expo-router';
export { destinationFor } from '@repo/client/navigation';

export function hrefFor(destination: NavigationDestination): Href {
  return destinationHref(destination);
}
