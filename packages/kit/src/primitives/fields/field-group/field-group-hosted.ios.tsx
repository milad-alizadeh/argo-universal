import { RNHostView } from '@expo/ui';
import { type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { InsideHostContext } from '#primitives/native/host';

const heightFromContent = { vertical: true };

/*
 * iOS: React Native content in a section. A FieldGroup is SwiftUI's Form, which draws only SwiftUI views, so a React
 * Native view put in a section as it is has no size the Form can see and draws as an empty card or a collapsed bar.
 * Only the height is matched: the width comes from the Form's row, which the content needs to lay out in. Inside the
 * row SwiftUI has ended, so a kit Host draws a Host of its own again.
 */
export function HostedSectionContent(props: {
  children: ReactNode;
}): ReactElement {
  return (
    <RNHostView matchContents={heightFromContent}>
      <View collapsable={false}>
        <InsideHostContext.Provider value={false}>
          {props.children}
        </InsideHostContext.Provider>
      </View>
    </RNHostView>
  );
}
