import type { ReactElement } from 'react';
import type { IconAction } from '#primitives/actions/action';
import { HeaderIconButton } from '#primitives/native/header-icon-button';
import { Host } from '#primitives/native/host';

// Universal Button has no stock icon-only variant; Compose owns this control's shape and touch target.
export function ScreenActionButton({
  action,
}: {
  action: IconAction;
}): ReactElement {
  return (
    <Host matchContents>
      <HeaderIconButton {...action} />
    </Host>
  );
}
