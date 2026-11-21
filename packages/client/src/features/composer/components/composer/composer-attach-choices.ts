import type { MenuAction } from '@repo/kit/primitives/overlays/menu';
import {
  type AttachChoice,
  slashCommandsChoice,
} from './composer-slash-commands-choice';
import type { AttachLayout } from './composer-toolbar-types';
import type { ComposerProps } from './composer-types';

// What Attach offers: a phone attaches from the camera, the photo library and Files; a wide window attaches files and starts a Goal.
export function attachChoices(layout: AttachLayout): AttachChoice[] {
  return layout.wide ? wideChoices(layout) : phoneChoices(layout);
}

// The choices as the rows of a system menu, where one with nothing to run is disabled.
export function attachMenuActions(layout: AttachLayout): MenuAction[] {
  return attachChoices(layout).map(({ label, icon, onPress }) => ({
    label,
    icon,
    disabled: !onPress,
    onPress: onPress ?? nothing,
  }));
}

const nothing = (): void => undefined;

function wideChoices(layout: AttachLayout): AttachChoice[] {
  const { props } = layout;

  return [
    {
      label: 'Files',
      icon: 'folder',
      onPress: props.onAttachFiles ?? props.onAttachImages,
    },
    slashCommandsChoice(layout),
    { label: 'Goal', icon: 'goal', onPress: props.onCreateGoal },
  ];
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
