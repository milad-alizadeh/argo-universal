import { IconButtonMenu } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import { attachMenuActions } from './composer-attach-choices';
import type { AttachLayout } from './composer-toolbar-types';

// iOS and Android: a circle the size of Send that opens the system's menu, which suits a few short choices better than a sheet.
export function ComposerAttachMenu(layout: AttachLayout): React.JSX.Element {
  return (
    <IconButtonMenu
      icon="add"
      variant="secondary"
      size="sm"
      accessibilityLabel="Attach"
      disabled={layout.inactive}
      actions={attachMenuActions(layout)}
    />
  );
}
