import { RNHostView } from '@expo/ui';
import type * as React from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { Icon, IconSlot } from '#primitives/content/icon';
import { NativeIcon } from './native-icon';
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

// An Argo icon inside a Compose tree: Expo UI's Icon in the control's content colour, or Argo's muted tone.
export function NativeSymbol(props: NativeSymbolProps): React.JSX.Element {
  const { mutedForeground } = useNativeTheme().colors;

  return (
    <NativeIcon
      {...props}
      color={props.muted === true ? mutedForeground : undefined}
      fallback={<HostedSymbol {...props} />}
    />
  );
}

// An icon Expo UI cannot draw, hosted as a React Native view; the row it sits in names it for screen readers.
function HostedSymbol({
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
