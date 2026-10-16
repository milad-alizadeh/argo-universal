import type * as React from 'react';
import { Text } from '#primitives/display/text';

const headingProps = {
  role: 'heading',
  accessibilityRole: 'heading',
  'aria-level': 2,
  className: 'px-4 pt-4',
} as const;

// Paper: a desktop popover names itself above its content.
export function PopoverTitle(props: { children: string }): React.JSX.Element {
  return <Text {...headingProps}>{props.children}</Text>;
}
