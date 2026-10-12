import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import { Icon, IconSlot } from './icon';
import type { NativeSymbolProps } from './native-symbol-props';

// An Argo icon inside a Compose tree, hosted as a React Native view; the row it sits in names it for screen readers.
export function NativeSymbol({
  muted = false,
  ...props
}: NativeSymbolProps): React.JSX.Element {
  return (
    <RNHostView matchContents>
      <IconSlot
        role={props.role}
        collapsable={false}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon
          {...props}
          className={muted ? 'text-muted-foreground' : undefined}
        />
      </IconSlot>
    </RNHostView>
  );
}
