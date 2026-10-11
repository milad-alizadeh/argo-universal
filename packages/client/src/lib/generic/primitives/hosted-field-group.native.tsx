import { FieldGroup as NativeFieldGroup } from '@expo/ui';
import {
  listRowBackground,
  padding,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Children, isValidElement } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { HostedRow } from './field-group-row';
import { Host } from './host';

const groupedFormTopInset = 35;
type ChildrenProps = { children: React.ReactNode };
type FieldSectionProps = ChildrenProps & {
  background: ReturnType<typeof useResolveClassNames>['backgroundColor'];
  sectionKey: React.Key | null;
};

function Group({
  children,
}: React.ComponentProps<typeof View>): React.JSX.Element {
  const { height } = useWindowDimensions();
  return (
    <Host {...fieldHostProps(height)}>
      <FieldSections>{children}</FieldSections>
    </Host>
  );
}

function fieldHostProps(height: number): React.ComponentProps<typeof Host> {
  if (Platform.OS === 'android')
    return {
      matchContents: { vertical: true },
      useViewportSizeMeasurement: true,
      style: { width: '100%' },
    };
  return {
    matchContents: false,
    useViewportSizeMeasurement: false,
    style: { height: height / 2 },
  };
}

function FieldSections({ children }: ChildrenProps): React.JSX.Element {
  const sections = useSections(children);
  return (
    <NativeFieldGroup
      style={{ backgroundColor: 'transparent' }}
      modifiers={groupModifiers()}
    >
      {sections}
    </NativeFieldGroup>
  );
}

function useSections(children: React.ReactNode): React.JSX.Element[] {
  const background = useResolveClassNames('bg-card/50').backgroundColor;
  return Children.toArray(children)
    .filter(isValidElement<React.ComponentProps<typeof View>>)
    .map((section) =>
      fieldSection({
        sectionKey: section.key,
        background,
        children: section.props.children,
      }),
    );
}

function fieldSection(props: FieldSectionProps): React.JSX.Element {
  const { background, children, sectionKey } = props;
  return (
    <NativeFieldGroup.Section
      key={sectionKey}
      modifiers={sectionModifiers(background)}
    >
      {Children.map(Children.toArray(children), (child) => (
        <HostedRow>{child}</HostedRow>
      ))}
    </NativeFieldGroup.Section>
  );
}

function groupModifiers(): React.ComponentProps<
  typeof NativeFieldGroup
>['modifiers'] {
  return Platform.OS === 'ios'
    ? [
        scrollContentBackground('hidden'),
        padding({ top: -groupedFormTopInset }),
      ]
    : [];
}

function sectionModifiers(
  background: FieldSectionProps['background'],
): React.ComponentProps<typeof NativeFieldGroup.Section>['modifiers'] {
  return Platform.OS === 'ios' && typeof background === 'string'
    ? [listRowBackground(background)]
    : [];
}

const FieldGroup = Object.assign(Group, { Section: View });
export { FieldGroup };
