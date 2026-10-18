import { Text } from '@expo/ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { codeFace, useDangerColor } from './native-text-exceptions';
import type { NativeTextProps } from './native-text-props';

/*
 * SwiftUI's text keeps the font its List, Section, Form row or Button gives it, which scales with
 * Dynamic Type, so the role sets nothing here. Only code and danger add a modifier; the one closest
 * to the text wins, so they go before the caller's own.
 */
export function NativeText(props: NativeTextProps): React.JSX.Element {
  const danger = useDangerColor(props.tone);

  return (
    <Text
      numberOfLines={props.numberOfLines}
      modifiers={[
        ...codeFace(props.code).modifiers,
        ...(danger === undefined ? [] : [foregroundStyle(danger)]),
        ...(props.modifiers ?? []),
      ]}
    >
      {props.children}
    </Text>
  );
}
