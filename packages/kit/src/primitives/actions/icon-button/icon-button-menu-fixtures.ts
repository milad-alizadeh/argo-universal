import type { IconButtonMenuProps } from './icon-button-menu-props';

type Look = Omit<IconButtonMenuProps, 'actions'>;

export const secondaryIconButtonMenu = {
  icon: 'add',
  variant: 'secondary',
  size: 'sm',
  accessibilityLabel: 'Add',
} satisfies Look;

export const disabledIconButtonMenu = {
  ...secondaryIconButtonMenu,
  disabled: true,
} satisfies Look;
