import type * as React from 'react';
import type { PermissionRequestProps } from '../../../src/features/requests';
import { RequestComposerPreview } from '../../request-composer';

// A Permission request where a Session shows it: in the Composer's tray.
export function PermissionPreview(
  props: PermissionRequestProps,
): React.JSX.Element {
  return <RequestComposerPreview permissionRequest={props} />;
}
