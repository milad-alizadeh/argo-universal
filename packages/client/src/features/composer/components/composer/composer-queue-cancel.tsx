import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement } from 'react';
import { ComposerAttachMenu } from './composer-attach-menu';
import type { LeftControlsLayout } from './composer-toolbar-types';

export function ComposerAttachmentOrCancel(
  layout: LeftControlsLayout,
): ReactElement {
  const edit = layout.props.queueEdit;

  if (!edit) return <ComposerAttachMenu {...layout} />;

  return (
    <IconButton
      {...cancelProps}
      disabled={layout.inactive}
      onPress={edit.cancel}
    />
  );
}

const cancelProps = {
  icon: 'close',
  accessibilityLabel: 'Cancel queue edit',
  size: 'sm',
  variant: 'ghost',
} as const;
