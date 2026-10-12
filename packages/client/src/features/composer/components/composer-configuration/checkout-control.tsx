import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Button } from '#primitives/buttons/button/button';
import { Text } from '#primitives/display/text/text';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { Chevron } from '../../../../lib/generic/symbols/chevron';
import { Icon } from '../../../../lib/generic/symbols/icon';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { ConfigurationChoice } from './configuration-choice';
import type { ComposerConfigurationProps } from './configuration-types';

export function CheckoutContents({
  checkout,
  disabled,
  close,
}: {
  checkout: ComposerConfigurationProps['checkout'];
  disabled: boolean;
  close: () => void;
}): React.JSX.Element {
  return (
    <View className="native:flex-1 wide:p-3 bg-sidebar">
      <FieldGroup fit>
        <FieldSection>
          {[false, true].map((newWorktree) => (
            <ConfigurationChoice
              key={String(newWorktree)}
              label={newWorktree ? 'New worktree' : 'Local'}
              selected={checkout.newWorktree === newWorktree}
              leading={
                <Icon
                  name={newWorktree ? 'branch' : 'folder'}
                  className="text-muted-foreground"
                />
              }
              onPress={() => {
                if (disabled) return;
                checkout.onNewWorktreeChange?.(newWorktree);
                close();
              }}
            />
          ))}
        </FieldSection>
      </FieldGroup>
    </View>
  );
}

export function ComposerCheckoutControl({
  checkout,
  disabled,
}: {
  checkout: ComposerConfigurationProps['checkout'];
  disabled: boolean;
}): React.JSX.Element {
  const created = !!checkout.path;
  const editable = !created && !!checkout.onNewWorktreeChange;
  if (created || !editable)
    return (
      <View className="h-7 min-w-0 max-w-96 px-1.5 flex-row items-center gap-1.5">
        <Icon
          name={checkout.newWorktree ? 'branch' : 'folder'}
          className="text-muted-foreground"
        />
        <Text
          selectable={false}
          numberOfLines={1}
          role={checkout.newWorktree ? 'code' : 'secondary'}
          className={cn('select-none min-w-0 shrink')}
        >
          {checkout.newWorktree
            ? checkout.path
                ?.replace(/[\\/]+$/, '')
                .split(/[\\/]/)
                .pop() || checkout.branch.toLowerCase()
            : 'Local'}
        </Text>
      </View>
    );
  return (
    <ComposerPopover
      listContent
      label="Checkout"
      trigger={
        <Button
          appearance="content"
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Checkout"
          label={checkout.newWorktree ? 'New worktree' : 'Local'}
          icon={checkout.newWorktree ? 'branch' : 'folder'}
          className="h-7 sm:h-7 py-0 px-1.5 gap-1.5"
          labelClassName="text-muted-foreground"
          trailing={
            <Chevron
              textRole="control"
              name="chevron-down"
              className="text-muted-foreground"
            />
          }
        />
      }
    >
      {(close) => (
        <CheckoutContents
          checkout={checkout}
          disabled={disabled}
          close={close}
        />
      )}
    </ComposerPopover>
  );
}
