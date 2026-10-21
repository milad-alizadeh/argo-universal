import type * as React from 'react';
import { View } from 'react-native';
import type { IconButtonProps } from './icon-button-props';

const filterDot: React.JSX.Element = (
  <View className="absolute top-1.5 right-1.5 size-1.75 rounded-full border border-card bg-foreground" />
);

const sidebar = {
  icon: 'sidebar',
  variant: 'ghost',
  accessibilityLabel: 'Sidebar',
} as const;

export const defaultIconButton = {
  icon: 'more',
  accessibilityLabel: 'More actions',
} satisfies IconButtonProps;

export const extraSmallIconButton = {
  ...sidebar,
  size: 'xs',
} satisfies IconButtonProps;

export const smallIconButton = {
  ...sidebar,
  size: 'sm',
} satisfies IconButtonProps;

export const mediumIconButton = {
  ...sidebar,
  size: 'md',
} satisfies IconButtonProps;

export const largeIconButton = {
  ...sidebar,
  size: 'lg',
} satisfies IconButtonProps;

export const extraLargeIconButton = {
  ...sidebar,
  size: 'xl',
} satisfies IconButtonProps;

export const selectedIconButton = {
  icon: 'bold',
  variant: 'ghost',
  size: 'xs',
  accessibilityLabel: 'Bold',
  selected: true,
} satisfies IconButtonProps;

export const disabledIconButton = {
  ...defaultIconButton,
  disabled: true,
} satisfies IconButtonProps;

export const loadingIconButton = {
  ...defaultIconButton,
  loading: true,
} satisfies IconButtonProps;

export const badgeIconButton = {
  icon: 'filters',
  variant: 'ghost',
  accessibilityLabel: 'Filters',
  badge: filterDot,
} satisfies IconButtonProps;
