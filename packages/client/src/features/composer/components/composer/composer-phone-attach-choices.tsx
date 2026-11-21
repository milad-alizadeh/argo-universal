import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import { attachChoices } from './composer-attach-choices';
import type { AttachChoice } from './composer-slash-commands-choice';
import type { AttachLayout } from './composer-toolbar-types';

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
        {attachChoices(layout).map((item) => phoneAttachItem(item, close))}
      </FieldGroup.Section>
    </FieldGroup>
  );
}

function phoneAttachItem(
  item: AttachChoice,
  close: AttachMenuProps['close'],
): React.JSX.Element {
  return (
    <FieldGroup.Link
      key={item.label}
      title={item.label}
      leading={item.icon}
      action
      disabled={!item.onPress}
      onPress={() => close(item.onPress)}
    />
  );
}
