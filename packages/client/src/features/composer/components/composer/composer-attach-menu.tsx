import type * as React from 'react';
import { View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { IconButton } from '#primitives/buttons/icon-button';
import { FieldGroup } from '#primitives/fields/field-group';
import { FieldSection } from '#primitives/fields/field-section';
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

// A native touch target comes from hitSlop, so the controls draw at their visible size and line up with the text; the web ignores hitSlop and keeps its minimum.
export const composerIconButton =
  'size-7 native:min-h-0 native:min-w-0 android:min-h-0 android:min-w-0';

const attachTriggerProps = {
  icon: 'add',
  variant: 'ghost',
  iconRole: 'control',
  hitSlop: 8,
  accessibilityLabel: 'Attach',
  className: `p-0 ${composerIconButton}`,
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
    <View className="native:flex-1 wide:p-3 bg-sidebar">
      <FieldGroup fit>
        <FieldSection>
          <ComposerAttachItems {...menu} />
        </FieldSection>
      </FieldGroup>
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
      icon={item.icon}
      role="button"
      disclosure={false}
      disabled={!item.onPress}
      onPress={() => close(item.onPress)}
    />
  );
}
