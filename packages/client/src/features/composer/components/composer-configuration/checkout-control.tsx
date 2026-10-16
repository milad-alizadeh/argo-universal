import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { MenuTrigger } from '#primitives/overlays/menu';
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
    <View className="native:flex-1 wide:p-3 bg-content">
      <GroupedList fit>
        <CheckoutChoices {...props} />
      </GroupedList>
    </View>
  );
}

function CheckoutChoices(props: ContentsProps): React.JSX.Element {
  return (
    <GroupedListSection>
      {[false, true].map((newWorktree) => (
        <CheckoutChoice
          key={String(newWorktree)}
          {...props}
          newWorktree={newWorktree}
        />
      ))}
    </GroupedListSection>
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
    <View className="min-w-0 shrink">
      <Text
        selectable={false}
        numberOfLines={1}
        role={checkout.newWorktree ? 'code' : 'secondary'}
      >
        {checkoutName(checkout)}
      </Text>
    </View>
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
      tone="muted"
    />
  );
}

function checkoutTrigger({
  checkout,
  disabled,
}: CheckoutProps): React.JSX.Element {
  return (
    <MenuTrigger
      tone="muted"
      disabled={disabled}
      accessibilityLabel="Checkout"
      label={checkout.newWorktree ? 'New worktree' : 'Local'}
      icon={checkout.newWorktree ? 'branch' : 'folder'}
    />
  );
}
