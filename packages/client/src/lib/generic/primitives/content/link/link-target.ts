import type { Href } from 'expo-router';
import { isLinkUrl } from '#lib/generic/link-url';
import type { LinkProps } from './link-props';

export function isRoute(
  route: string | undefined,
): route is Extract<Href, string> {
  return route !== undefined && /^\/(?!\/)/.test(route);
}

function allowedUrl(href: string | undefined): string | undefined {
  if (href === undefined) return undefined;

  return isLinkUrl(href) ? href : undefined;
}

export function linkTarget({ href, route }: LinkProps): string | undefined {
  return isRoute(route) ? route : allowedUrl(href);
}
