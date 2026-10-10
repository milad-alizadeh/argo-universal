import {
  FieldGroup as NativeFieldGroup,
  Host,
  RNHostView,
  Row,
} from '@expo/ui';
import {
  HostPaletteContext,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import {
  frame,
  listRowBackground,
  padding,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Children, isValidElement, useState } from 'react';
import {
  Platform,
  processColor,
  View,
  useWindowDimensions,
} from 'react-native';
import { useResolveClassNames } from 'uniwind';

// SwiftUI's grouped Form adds this inset above its first section.
const groupedFormTopInset = 35;
const rgbMask = 0xffffff;
const hexRadix = 16;
const rgbHexLength = 6;

function Group({
  children,
}: React.ComponentProps<typeof View>): React.JSX.Element {
  const { height } = useWindowDimensions();
  const background = useResolveClassNames('bg-card/50').backgroundColor;
  const sections = Children.toArray(children).filter(
    isValidElement<React.ComponentProps<typeof View>>,
  );
  const fieldGroup = (
    <NativeFieldGroup
      style={{ backgroundColor: 'transparent' }}
      modifiers={
        Platform.OS === 'ios'
          ? [
              scrollContentBackground('hidden'),
              padding({ top: -groupedFormTopInset }),
            ]
          : []
      }
    >
      {sections.map((section) => (
        <NativeFieldGroup.Section
          key={section.key}
          modifiers={
            Platform.OS === 'ios' && typeof background === 'string'
              ? [listRowBackground(background)]
              : []
          }
        >
          {Children.toArray(section.props.children).map((child, index) => (
            <HostedRow key={index}>{child}</HostedRow>
          ))}
        </NativeFieldGroup.Section>
      ))}
    </NativeFieldGroup>
  );
  return (
    <Host style={{ height: height / 2 }}>
      {Platform.OS === 'android' ? (
        <AndroidFieldColors>{fieldGroup}</AndroidFieldColors>
      ) : (
        fieldGroup
      )}
    </Host>
  );
}

// Expo's sections read their row surface from the Host palette.
function AndroidFieldColors({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const colors = useMaterialColors();
  const surface = processColor(
    useResolveClassNames('bg-muted').backgroundColor,
  );
  return (
    <HostPaletteContext.Provider
      value={{
        ...colors,
        surfaceContainer:
          typeof surface === 'number'
            ? `#${(surface & rgbMask).toString(hexRadix).padStart(rgbHexLength, '0')}ff`
            : colors.surfaceContainer,
      }}
    >
      {children}
    </HostPaletteContext.Provider>
  );
}

// The native row supplies its width; React Native supplies the control's measured height.
function HostedRow({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const minimumHeight = useResolveClassNames('h-11').height;
  const [height, setHeight] = useState(
    typeof minimumHeight === 'number' ? minimumHeight : undefined,
  );
  return (
    <Row
      style={{ height }}
      modifiers={
        Platform.OS === 'ios'
          ? [frame({ height, maxWidth: Infinity })]
          : [fillMaxWidth()]
      }
    >
      <RNHostView>
        <View
          className="w-full"
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        >
          {children}
        </View>
      </RNHostView>
    </Row>
  );
}

const FieldGroup = Object.assign(Group, { Section: View });

export { FieldGroup };
