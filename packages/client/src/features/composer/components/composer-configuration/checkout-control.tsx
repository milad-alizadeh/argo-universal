import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/buttons/button/button';
import { Text } from '#primitives/display/text/text';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { Icon } from '../../../../lib/generic/symbols/icon';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { ConfigurationChoice } from './configuration-choice';
import type { ComposerConfigurationProps } from './configuration-types';
import { checkoutName } from './configuration-values';

interface CheckoutProps {
  checkout: ComposerConfigurationProps['checkout'];
  disabled: boolean;
}

interface ContentsProps extends CheckoutProps {
  close: () => void;
}

interface ChoiceProps extends ContentsProps {
  newWorktree: boolean;
}

export function CheckoutContents(props: ContentsProps): React.JSX.Element {
  return (
    <View className="native:flex-1 wide:p-3 bg-sidebar">
      <FieldGroup fit>
        <CheckoutChoices {...props} />
      </FieldGroup>
    </View>
  );
}

function CheckoutChoices(props: ContentsProps): React.JSX.Element {
  return (
    <FieldSection>
      {[false, true].map((newWorktree) => (
        <CheckoutChoice
          key={String(newWorktree)}
          {...props}
          newWorktree={newWorktree}
        />
      ))}
    </FieldSection>
  );
}

function CheckoutChoice(props: ChoiceProps): React.JSX.Element {
  const select = (): void => {
    if (props.disabled) return;
    props.checkout.onNewWorktreeChange?.(props.newWorktree);
    props.close();
  };

  return (
    <ConfigurationChoice
      label={props.newWorktree ? 'New worktree' : 'Local'}
      selected={props.checkout.newWorktree === props.newWorktree}
      leading={<CheckoutIcon newWorktree={props.newWorktree} />}
      onPress={select}
    />
  );
}

export function ComposerCheckoutControl(
  props: CheckoutProps,
): React.JSX.Element {
  if (props.checkout.path || !props.checkout.onNewWorktreeChange)
    return <CheckoutLabel checkout={props.checkout} />;

  return (
    <ComposerPopover
      listContent
      label="Checkout"
      trigger={checkoutTrigger(props)}
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
    <Text
      selectable={false}
      numberOfLines={1}
      role={checkout.newWorktree ? 'code' : 'secondary'}
      className="select-none min-w-0 shrink"
    >
      {checkoutName(checkout)}
    </Text>
  );
}

function CheckoutIcon({
  newWorktree,
}: {
  newWorktree: boolean;
}): React.JSX.Element {
  return (
    <Icon
      role="control"
      name={newWorktree ? 'branch' : 'folder'}
      className="text-muted-foreground"
    />
  );
}

function checkoutTrigger(props: CheckoutProps): React.JSX.Element {
  return (
    <Button {...checkoutButtonProps(props)} trailing={<CheckoutChevron />} />
  );
}

type CheckoutButtonProps = Extract<
  React.ComponentProps<typeof Button>,
  { appearance?: 'content' }
>;

function checkoutButtonProps({
  checkout,
  disabled,
}: CheckoutProps): CheckoutButtonProps {
  return {
    appearance: 'content',
    variant: 'ghost',
    disabled,
    accessibilityLabel: 'Checkout',
    label: checkout.newWorktree ? 'New worktree' : 'Local',
    icon: checkout.newWorktree ? 'branch' : 'folder',
    className: 'h-7 sm:h-7 py-0 px-1.5 gap-1.5',
    labelClassName: 'text-muted-foreground',
  };
}

function CheckoutChevron(): React.JSX.Element {
  return (
    <Icon
      role="control"
      name="chevron-down"
      className="text-muted-foreground"
    />
  );
}
