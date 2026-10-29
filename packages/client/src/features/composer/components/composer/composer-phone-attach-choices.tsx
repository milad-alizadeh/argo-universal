import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import {
  type AttachChoice,
  slashCommandsChoice,
} from './composer-slash-commands-choice';
import type { AttachLayout } from './composer-toolbar-types';
import type { ComposerProps } from './composer-types';

interface AttachMenuProps {
  layout: AttachLayout;
  close: (action?: () => void) => void;
}

export function PhoneAttachChoices({
  layout,
  close,
}: AttachMenuProps): React.JSX.Element {
  return (
    <FieldGroup>
      <FieldGroup.Section>
        {phoneChoices(layout).map((item) => phoneAttachItem(item, close))}
      </FieldGroup.Section>
    </FieldGroup>
  );
}

function phoneAttachItem(
  item: AttachChoice,
  close: AttachMenuProps['close'],
): React.JSX.Element {
  return (
    <Button
      key={item.label}
      label={item.label}
      icon={item.icon}
      variant="text"
      disabled={!item.onPress}
      onPress={() => close(item.onPress)}
    />
  );
}

function phoneChoices(layout: AttachLayout): AttachChoice[] {
  const { props } = layout;

  return [
    ...cameraChoice(props),
    { label: 'Photos', icon: 'photos', onPress: props.onAttachImages },
    ...fileChoice(props),
    slashCommandsChoice(layout),
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
