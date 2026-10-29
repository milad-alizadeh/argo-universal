import type { TextProps } from './text-props';

const children = 'The quick brown fox jumps over the lazy dog.';

export const titleText = { children, role: 'title' } satisfies TextProps;

export const headingText = { children, role: 'heading' } satisfies TextProps;

export const bodyText = { children, role: 'body' } satisfies TextProps;

export const bodyCodeText = { children, role: 'body-code' } satisfies TextProps;

export const secondaryText = {
  children,
  role: 'secondary',
} satisfies TextProps;

export const secondaryCodeText = {
  children,
  role: 'secondary-code',
} satisfies TextProps;

export const controlText = { children, role: 'control' } satisfies TextProps;

export const badgeText = { children, role: 'badge' } satisfies TextProps;

export const codeText = { children, role: 'code' } satisfies TextProps;

export const navTitleText = { children, role: 'nav-title' } satisfies TextProps;

export const navActionText = {
  children,
  role: 'nav-action',
} satisfies TextProps;

export const rowText = { children, role: 'row' } satisfies TextProps;

export const rowDetailText = {
  children,
  role: 'row-detail',
} satisfies TextProps;
