import type { Href } from 'expo-router';

export function scheduleHref({ id }: { id: string }): Href {
  return { pathname: '/scheduled/[id]', params: { id } };
}
