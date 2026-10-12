import type * as React from 'react';
import { Icon, type IconProps } from './icon';
import { type IconTextRole, useTextIconSize } from './text-icon-size';

// A chevron sized by the text role beside it: Body for rows, menus and Back, Control or Secondary inline with smaller labels.
export function Chevron({
  textRole,
  ...props
}: Omit<IconProps, 'size'> & { textRole?: IconTextRole }): React.JSX.Element {
  return <Icon {...props} size={useTextIconSize(textRole)} />;
}
