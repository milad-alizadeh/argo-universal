import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { List } from '@repo/kit/primitives/lists/list';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { MenuTrigger } from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { Platform, View } from 'react-native';
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
    <View className="native:flex-1 native:wide:p-3 bg-content web:wide:bg-card">
      {/* A phone's sheet fills its height, so the List scrolls in it; a web popover fits its rows. */}
      <List appearance="grouped" fit={Platform.OS === 'web'}>
        {checkoutChoices(props)}
      </List>
    </View>
  );
}

// List reads sections from its direct children to trim the final menu gap.
function checkoutChoices(props: ContentsProps): React.JSX.Element {
  return (
    <ListSection selectionMode="single">
      {[false, true].map((newWorktree) => (
        <CheckoutChoice
          key={String(newWorktree)}
          {...props}
          newWorktree={newWorktree}
        />
      ))}
    </ListSection>
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
      <Text selectable={false} numberOfLines={1} {...pathText(checkout)}>
        {checkoutName(checkout)}
      </Text>
    </View>
  );
}

// A branch keeps its prefix and its end; the web ignores the mode and cuts the tail.
const pathText = (
  checkout: CheckoutProps['checkout'],
): Pick<React.ComponentProps<typeof Text>, 'ellipsizeMode' | 'role'> =>
  checkout.newWorktree
    ? { ellipsizeMode: 'middle', role: 'code' }
    : { ellipsizeMode: 'tail', role: 'secondary' };

function CheckoutIcon({
  newWorktree,
}: {
  newWorktree: boolean;
}): React.JSX.Element {
  return (
    <Icon size="sm" name={newWorktree ? 'branch' : 'folder'} tone="muted" />
  );
}

function checkoutTrigger({
  checkout,
  disabled,
}: CheckoutProps): React.JSX.Element {
  return (
    <MenuTrigger
      labelRole={{ compact: 'row', wide: 'secondary' }}
      disabled={disabled}
      accessibilityLabel="Checkout"
      label={checkout.newWorktree ? 'New worktree' : 'Local'}
      icon={checkout.newWorktree ? 'branch' : 'folder'}
    />
  );
}
