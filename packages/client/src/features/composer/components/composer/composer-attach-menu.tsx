import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import { View } from 'react-native';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { attachChoices } from './composer-attach-choices';
import { PhoneAttachChoices } from './composer-phone-attach-choices';
import type { AttachChoice } from './composer-slash-commands-choice';
import type { AttachLayout } from './composer-toolbar-types';

// The web and the desktop app: a popover on a wide window, a sheet on a narrow one. iOS and Android open a system menu (composer-attach-menu.native).
export function ComposerAttachMenu(layout: AttachLayout): React.JSX.Element {
  return (
    <ComposerPopover
      listContent
      label="Attach"
      trigger={attachTrigger(layout.inactive)}
    >
      {(close) => <ComposerAttachChoices layout={layout} close={close} />}
    </ComposerPopover>
  );
}

const attachTriggerProps = {
  icon: 'add',
  variant: 'ghost',
  size: 'sm',
  control: true,
  accessibilityLabel: 'Attach',
} as const;

function attachTrigger(inactive: boolean): React.JSX.Element {
  return <IconButton {...attachTriggerProps} disabled={inactive} />;
}

interface AttachMenuProps {
  layout: AttachLayout;
  close: (action?: () => void) => void;
}

function ComposerAttachChoices(menu: AttachMenuProps): React.JSX.Element {
  if (!menu.layout.wide) return <PhoneAttachChoices {...menu} />;

  return (
    <View className="bg-content wide:bg-card">
      {/* A popover fits its rows. */}
      <List appearance="plain" fit>
        <ListSection>
          <ComposerAttachItems {...menu} />
        </ListSection>
      </List>
    </View>
  );
}

function ComposerAttachItems({
  layout,
  close,
}: AttachMenuProps): React.JSX.Element {
  const choices = attachChoices(layout);

  return (
    <>
      {choices.map((item) => (
        <ComposerAttachItem key={item.label} item={item} close={close} />
      ))}
    </>
  );
}

interface AttachItemProps {
  item: AttachChoice;
  close: AttachMenuProps['close'];
}

function ComposerAttachItem({
  item,
  close,
}: AttachItemProps): React.JSX.Element {
  return (
    <ListItem
      title={item.label}
      leading={<Icon name={item.icon} />}
      accessibilityRole="button"
      disabled={!item.onPress}
      onPress={() => close(item.onPress)}
    />
  );
}
