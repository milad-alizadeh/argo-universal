import { Spinner } from '#primitives/status/spinner';
import type { MenuTriggerProps } from './menu-props';

export const defaultMenuTrigger = {
  label: 'Item',
  icon: 'folder',
} satisfies MenuTriggerProps;

export const mutedMenuTrigger = {
  label: 'Muted',
  icon: 'branch',
  tone: 'muted',
} satisfies MenuTriggerProps;

export const dangerMenuTrigger = {
  label: 'Danger',
  icon: 'private',
  tone: 'danger',
} satisfies MenuTriggerProps;

export const noIconMenuTrigger = {
  label: 'No icon',
  tone: 'muted',
} satisfies MenuTriggerProps;

export const disabledMenuTrigger = {
  label: 'Disabled',
  icon: 'folder',
  tone: 'muted',
  disabled: true,
} satisfies MenuTriggerProps;

export const iconOnlyMenuTrigger = {
  label: 'Options',
  icon: 'plan-mode',
  iconOnly: true,
} satisfies MenuTriggerProps;

export const leadingMenuTrigger = {
  label: 'Label',
  leading: <Spinner accessibilityLabel="Loading" />,
} satisfies MenuTriggerProps;
