import type { LinkProps } from './link-props';

const label = 'Read more';

export const inlineLink = {
  label,
  href: 'https://example.com',
} satisfies LinkProps;

export const standaloneLink = {
  label,
  href: 'https://example.com',
} satisfies LinkProps;

export const routeLink = {
  label: 'Settings',
  route: '/settings',
} satisfies LinkProps;

export const unsupportedLink = {
  label: 'Unsupported link',
  href: 'file:///example.txt',
} satisfies LinkProps;
