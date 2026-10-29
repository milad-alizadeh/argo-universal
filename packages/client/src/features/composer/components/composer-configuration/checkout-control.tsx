import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { MenuTrigger } from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { ComposerPopover } from '../composer-popover/composer-popover';
import type { ComposerConfigurationProps } from './configuration-types';
import { checkoutName } from './configuration-values';

interface CheckoutProps {
  checkout: ComposerConfigurationProps['checkout'];
  disabled: boolean;
}

interface ContentsProps extends CheckoutProps {
  close: () => void;
}

const checkoutOptions = [
  { value: 'local', label: 'Local', icon: 'folder' },
  { value: 'worktree', label: 'New worktree', icon: 'branch' },
] as const;

export function CheckoutContents(props: ContentsProps): React.JSX.Element {
  return (
    <View className="native:flex-1 bg-content web:wide:bg-card">
      <FieldGroup>
        <FieldGroup.Section>{checkoutPicker(props)}</FieldGroup.Section>
      </FieldGroup>
    </View>
  );
}

function checkoutPicker(props: ContentsProps): React.JSX.Element {
  return (
    <FieldGroup.Picker
      title="Checkout"
      presentation="inline"
      value={props.checkout.newWorktree ? 'worktree' : 'local'}
      options={checkoutOptions}
      disabled={props.disabled}
      onValueChange={(value) => chooseCheckout(props, value)}
    />
  );
}

function chooseCheckout(props: ContentsProps, value: string): void {
  if (props.disabled) return;

  props.checkout.onNewWorktreeChange?.(value === 'worktree');
  props.close();
}

export function ComposerCheckoutControl(
  props: CheckoutProps,
): React.JSX.Element {
  if (props.checkout.path || !props.checkout.onNewWorktreeChange)
    return <CheckoutLabel checkout={props.checkout} />;

  return <CheckoutPicker {...props} />;
}

function CheckoutPicker(props: CheckoutProps): React.JSX.Element {
  const wide = useContentWide();

  return (
    <ComposerPopover
      listContent
      label="Checkout"
      trigger={checkoutTrigger(props, wide)}
    >
      {(close) => <CheckoutContents {...props} close={close} />}
    </ComposerPopover>
  );
}

function CheckoutLabel({
  checkout,
}: Pick<CheckoutProps, 'checkout'>): React.JSX.Element {
  return (
    <View className="h-7 min-w-0 max-w-96 px-1.5 flex-row items-center gap-1.5">
      <CheckoutIcon newWorktree={checkout.newWorktree} />
      <CheckoutPath checkout={checkout} />
    </View>
  );
}

function CheckoutPath({
  checkout,
}: Pick<CheckoutProps, 'checkout'>): React.JSX.Element {
  return (
    <View className="min-w-0 shrink">
      <Text selectable={false} numberOfLines={1} {...pathText(checkout)}>
        {checkoutName(checkout)}
      </Text>
    </View>
  );
}

// A branch keeps its prefix and its end; the web ignores the mode and cuts the tail.
const pathText = (
  checkout: CheckoutProps['checkout'],
): Pick<
  React.ComponentProps<typeof Text>,
  'ellipsizeMode' | 'role' | 'tone'
> =>
  checkout.newWorktree
    ? { ellipsizeMode: 'middle', role: { compact: 'code', wide: 'body-code' } }
    : {
        ellipsizeMode: 'tail',
        role: { compact: 'secondary', wide: 'body' },
        tone: 'muted',
      };

function CheckoutIcon({
  newWorktree,
}: {
  newWorktree: boolean;
}): React.JSX.Element {
  return <Icon name={newWorktree ? 'branch' : 'folder'} tone="muted" />;
}

function checkoutTrigger(
  { checkout, disabled }: CheckoutProps,
  wide: boolean,
): React.JSX.Element {
  return (
    <MenuTrigger
      tone={wide ? 'muted' : undefined}
      disabled={disabled}
      accessibilityLabel="Checkout"
      {...checkoutChoice(checkout)}
    />
  );
}

const checkoutChoice = (
  checkout: CheckoutProps['checkout'],
): Pick<React.ComponentProps<typeof MenuTrigger>, 'label' | 'icon'> =>
  checkout.newWorktree
    ? { label: 'New worktree', icon: 'branch' }
    : { label: 'Local', icon: 'folder' };
