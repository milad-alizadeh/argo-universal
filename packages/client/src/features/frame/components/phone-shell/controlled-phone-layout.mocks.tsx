import { PortalHost } from '@rn-primitives/portal';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fn, type Mock } from 'storybook/test';
import { Text } from '#lib/generic/primitives/display/text/text';
import { NavigationProvider } from '#lib/product/navigation/context';
import {
  ScreenHeader,
  ScreenHeaderProvider,
} from '#lib/product/navigation/screen-header';
import { ScreenHeaderMock } from '../../../../../mocks/screen-header-mock';
import { sectionDestination } from '../../../../lib/product/navigation/sections';
import type { Section } from '../../../../lib/product/navigation/sections';
import { PhoneLayoutView } from '../phone-layout-view';
import { PhoneMenuButton } from '../phone-menu-button';
import { shellSections } from '../shell-sections';

export interface ControlledLayoutProps {
  section: Section;
  attentionCount: number;
  onSectionChange: Mock;
}

interface ProvidersProps {
  children: ReactNode;
}

function SectionContent({ section }: { section: Section }): React.JSX.Element {
  return (
    <View testID="phone-shell-content" className="flex-1">
      <ScreenHeader
        title={shellSections[section].title}
        left={<PhoneMenuButton />}
      />
      <Text>{shellSections[section].title} content</Text>
    </View>
  );
}

function PhoneLayoutProviders({ children }: ProvidersProps): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <NavigationProvider navigate={fn()}>
          <ScreenHeaderProvider header={ScreenHeaderMock}>
            {children}
            <PortalHost />
          </ScreenHeaderProvider>
        </NavigationProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

export function ControlledPhoneLayout({
  section,
  ...layout
}: ControlledLayoutProps): React.JSX.Element {
  return (
    <PhoneLayoutProviders>
      <View style={{ height: 600 }} className="w-full">
        <PhoneLayoutView {...layout} destination={sectionDestination(section)}>
          <SectionContent section={section} />
        </PhoneLayoutView>
      </View>
    </PhoneLayoutProviders>
  );
}
