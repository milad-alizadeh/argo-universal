import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import { Icon, IconSlot } from '#primitives/display/icon/icon';
import type { NativeSymbolProps } from './native-symbol-props';

const hostedIconSlot = {
  collapsable: false,
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

function mutedClassName(muted: boolean | undefined): string | undefined {
  return muted === true ? 'text-muted-foreground' : undefined;
}

// An Argo icon inside a Compose tree, hosted as a React Native view; the row it sits in names it for screen readers.
export function NativeSymbol({
  muted,
  ...props
}: NativeSymbolProps): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <IconSlot role={props.role} {...hostedIconSlot}>
        <Icon {...props} className={mutedClassName(muted)} />
      </IconSlot>
    </RNHostView>
  );
}
