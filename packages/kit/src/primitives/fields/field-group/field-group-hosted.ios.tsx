import { RNHostView } from '@expo/ui';
import { type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { InsideHostContext } from '#primitives/native/host';

/*
 * iOS: React Native content in a section. A FieldGroup is SwiftUI's Form, which draws only SwiftUI views, so a React
 * Native view put in a section as it is has no size SwiftUI can see: a List drew an empty card (#1763) and a Canvas
 * a flat bar with no caption beside it (#1761). RNHostView hosts the content as the section's one row: the row takes
 * its width from the Form, which gives the content its width to lay out in, and the content gives the row its height.
 * Inside the row SwiftUI has ended, so a kit Host draws a Host of its own again.
 */
export function HostedSectionContent(props: {
  children: ReactNode;
}): ReactElement {
  return (
    <RNHostView matchContents={{ vertical: true }}>
      <View collapsable={false}>
        <InsideHostContext.Provider value={false}>
          {props.children}
        </InsideHostContext.Provider>
      </View>
    </RNHostView>
  );
}
