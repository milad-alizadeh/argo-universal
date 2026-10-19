import type * as React from 'react';
import { View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { IconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
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

// Desktop controls match Paper; native hitSlop and narrow web minimums preserve touch targets.
export const composerIconButton =
  'size-7 wide:min-h-0 wide:min-w-0 native:min-h-0 native:min-w-0 android:min-h-0 android:min-w-0';

const attachTriggerProps = {
  icon: 'add',
  variant: 'ghost',
  size: 'xs',
  iconRole: 'control',
  hitSlop: 8,
  accessibilityLabel: 'Attach',
  // Wide, a 16x28 slot. `wide:sm:` because the CSS orders `wide:` before the size's `sm:`.
  className: `p-0 ${composerIconButton} wide:sm:w-4 wide:mr-1.5`,
  iconClassName: 'text-muted-foreground',
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
      <List appearance="grouped" fit>
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
