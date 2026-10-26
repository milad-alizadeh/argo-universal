// Android only: universal Text starts from Compose's TextStyle.Default, so Material's type needs Compose's own Text.
import { Text, type TextProps } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useTextColor } from './native-text-color';
import { codeFace } from './native-text-exceptions';
import type { NativeTextProps, NativeTextRole } from './native-text-props';

type Typography = NonNullable<NonNullable<TextProps['style']>['typography']>;

// Material 3's styles for list headlines, supporting text, labels and section titles, as Expo's own Section titles its sections.
const typography = {
  body: 'bodyLarge',
  secondary: 'bodyMedium',
  control: 'labelLarge',
  heading: 'titleMedium',
} as const satisfies Record<NativeTextRole, Typography>;

export function NativeText(props: NativeTextProps): React.JSX.Element {
  return (
    <Text
      style={textStyle(props)}
      color={useTextColor(props.tone)}
      {...lineLimit(props.numberOfLines)}
      modifiers={props.modifiers}
    >
      {props.children}
    </Text>
  );
}

function textStyle(props: NativeTextProps): TextProps['style'] {
  return {
    ...codeFace(props.code).textStyle,
    typography: typography[props.role ?? 'body'],
  };
}

// A capped line ends in an ellipsis, as SwiftUI's does.
function lineLimit(
  lines: number | undefined,
): Pick<TextProps, 'maxLines' | 'overflow'> {
  return lines === undefined ? {} : { maxLines: lines, overflow: 'ellipsis' };
}

NativeText satisfies React.ComponentType<NativeTextProps>;
