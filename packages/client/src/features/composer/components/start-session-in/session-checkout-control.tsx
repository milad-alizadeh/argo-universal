import {
  MenuTrigger,
  type MenuTriggerProps,
} from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { View } from 'react-native';
import { CheckoutContents } from '../composer-configuration/composer-configuration';
import { ComposerPopover } from '../composer-popover/composer-popover';
import type { StartSessionInProps } from './start-session-types';

type CheckoutControlProps = Pick<StartSessionInProps, 'checkout' | 'disabled'>;

export function SessionCheckoutControl(
  props: CheckoutControlProps,
): React.JSX.Element {
  return (
    <View className="px-4">
      <ComposerPopover
        listContent
        label="Checkout"
        trigger={checkoutTrigger(props)}
      >
        {(close) => checkoutContents(props, close)}
      </ComposerPopover>
    </View>
  );
}

// Phones only: one stacked row under the Project.
function checkoutTrigger(props: CheckoutControlProps): React.JSX.Element {
  return (
    <MenuTrigger
      {...checkoutButtonLabels(props)}
      tone="muted"
      disabled={props.disabled || !props.checkout.onNewWorktreeChange}
      accessibilityLabel="Checkout"
    />
  );
}

function checkoutButtonLabels(
  props: Pick<CheckoutControlProps, 'checkout'>,
): Pick<MenuTriggerProps, 'label' | 'icon'> {
  return props.checkout.newWorktree
    ? { label: 'New worktree', icon: 'branch' }
    : { label: 'Local', icon: 'folder' };
}

function checkoutContents(
  props: CheckoutControlProps,
  close: () => void,
): React.JSX.Element {
  return (
    <CheckoutContents
      checkout={props.checkout}
      disabled={props.disabled ?? false}
      close={close}
    />
  );
}
