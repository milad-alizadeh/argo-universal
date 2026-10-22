import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { IconName } from '@repo/kit/symbols/icon-names';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { ComposerPopover } from '../composer-popover/composer-popover';
import type { AttachLayout } from './composer-toolbar-types';
import type { ComposerProps } from './composer-types';

interface AttachChoice {
  label: string;
  icon: IconName;
  onPress?: () => void;
}

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
  return (
    <View className="native:flex-1 native:wide:p-3 bg-content web:wide:bg-card">
      {/* A phone's sheet fills its height, so the List scrolls in it; a web popover fits its rows. */}
      <List appearance="grouped" fit={Platform.OS === 'web'}>
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
  const choices = layout.wide
    ? wideChoices(layout.props)
    : phoneChoices(layout.props);

  return (
    <>
      {choices.map((item) => (
        <ComposerAttachItem key={item.label} item={item} close={close} />
      ))}
    </>
  );
}

type WideAttachChoices = Pick<
  AttachLayout['props'],
  'onAttachFiles' | 'onAttachImages' | 'onSelectSlashCommand' | 'onCreateGoal'
>;

function wideChoices(props: WideAttachChoices): AttachChoice[] {
  return [
    {
      label: 'Files',
      icon: 'folder',
      onPress: props.onAttachFiles ?? props.onAttachImages,
    },
    {
      label: 'Slash Commands',
      icon: 'code',
      onPress: props.onSelectSlashCommand,
    },
    { label: 'Goal', icon: 'goal', onPress: props.onCreateGoal },
  ];
}

function phoneChoices(
  props: Pick<
    AttachLayout['props'],
    'onAttachCamera' | 'onAttachImages' | 'onAttachFiles'
  >,
): AttachChoice[] {
  return [
    ...cameraChoice(props),
    { label: 'Photos', icon: 'photos', onPress: props.onAttachImages },
    ...fileChoice(props),
  ];
}

function cameraChoice(
  props: Pick<ComposerProps, 'onAttachCamera'>,
): AttachChoice[] {
  return props.onAttachCamera
    ? [{ label: 'Camera', icon: 'camera', onPress: props.onAttachCamera }]
    : [];
}

function fileChoice(
  props: Pick<ComposerProps, 'onAttachFiles'>,
): AttachChoice[] {
  return props.onAttachFiles
    ? [{ label: 'Files', icon: 'folder', onPress: props.onAttachFiles }]
    : [];
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
      leading={<Icon name={item.icon} role="row" />}
      accessibilityRole="button"

      disabled={!item.onPress}
      onPress={() => close(item.onPress)}
    />
  );
}
