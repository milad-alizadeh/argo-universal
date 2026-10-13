import type * as React from 'react';
import { Button } from '#primitives/buttons/button/button';
import { CheckoutContents } from '../composer-configuration/composer-configuration';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { SessionControlDisclosure } from './session-control-disclosure';
import type { StartSessionInProps } from './start-session-types';
type CheckoutControlProps = Pick<StartSessionInProps, 'checkout' | 'disabled'>;

export function SessionCheckoutControl(
  props: CheckoutControlProps,
): React.JSX.Element {
  return (
    <ComposerPopover
      listContent
      label="Checkout"
      trigger={checkoutTrigger(props)}
    >
      {(close) => checkoutContents(props, close)}
    </ComposerPopover>
  );
}
function checkoutTrigger(props: CheckoutControlProps): React.JSX.Element {
  return <Button {...checkoutButtonProps(props)} />;
}
function checkoutButtonProps(
  props: CheckoutControlProps,
): React.ComponentProps<typeof Button> {
  return {
    ...checkoutButtonLabels(props),
    appearance: 'content',
    variant: 'ghost',
    disabled: props.disabled || !props.checkout.onNewWorktreeChange,
    accessibilityLabel: 'Checkout',
    labelClassName: 'text-muted-foreground',
    className: 'h-10 sm:h-10 px-4 gap-1.5 justify-start',
    trailing: <SessionControlDisclosure />,
  };
}
function checkoutButtonLabels(
  props: Pick<CheckoutControlProps, 'checkout'>,
): Pick<React.ComponentProps<typeof Button>, 'label' | 'icon'> {
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
