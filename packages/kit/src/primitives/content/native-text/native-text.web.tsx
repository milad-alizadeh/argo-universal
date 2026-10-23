import type * as React from 'react';
import { Text } from '#primitives/content/text';
import type { NativeTextProps } from './native-text-props';

// The web has no native container to give text its font, so text inside an Expo UI tree takes the kit's own role.
export function NativeText(props: NativeTextProps): React.JSX.Element {
  return (
    <Text
      role={props.code === true ? 'code' : (props.role ?? 'body')}
      tone={props.tone}
      numberOfLines={props.numberOfLines}
    >
      {props.children}
    </Text>
  );
}

NativeText satisfies React.ComponentType<NativeTextProps>;
