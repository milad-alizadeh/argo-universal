import { FieldGroup, Text, type TextProps } from '@expo/ui';
import {
  accessibilityAddTraits,
  foregroundStyle,
  headerProminence,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import {
  useSwiftUITextModifiers,
  useUniversalTextStyle,
} from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListSectionProps } from './grouped-list-section-props';
import { GroupedListSection as WebGroupedListSection } from './grouped-list-section.tsx';

const ios = Platform.OS === 'ios';

export function GroupedListSection(
  props: GroupedListSectionProps,
): React.JSX.Element {
  if (useWide()) return <WebGroupedListSection {...props} />;

  return fieldSection(props);
}

/*
 * The stock FieldGroup.Section. Android's FieldGroup knows a section only by its element type, and
 * wraps anything else in an implicit section card (@expo/ui 57 FieldGroup/groupChildren.tsx), so
 * GroupedList swaps each GroupedListSection child for this element. The section makes each of its
 * children one row (FieldSectionSlots.tsx), so rows are its direct children.
 *
 * Increased prominence keeps an iOS header in title case, as Paper's is; without it Form uppercases
 * the header. It changes no separator, row fill or page colour; the header sets its own font.
 */
export function fieldSection(
  props: GroupedListSectionProps,
  key?: React.Key,
): React.JSX.Element {
  return (
    <FieldGroup.Section key={key} {...sectionTitle(props.title)}>
      {headerSlot(props.title)}
      {footerSlot(props)}
      {props.children}
    </FieldGroup.Section>
  );
}

// iOS sets the title in its header slot; Android's Section draws the plain title itself.
const sectionTitle = (
  title: string | undefined,
): Pick<
  React.ComponentProps<typeof FieldGroup.Section>,
  'title' | 'modifiers'
> => (ios ? { modifiers: [headerProminence('increased')] } : { title });

// The Section finds its header and footer by the slot element's type, so these are called, not rendered as components.
function headerSlot(title: string | undefined): React.ReactNode {
  if (!ios || !title) return null;

  return (
    <FieldGroup.SectionHeader>
      <HeaderText title={title} />
    </FieldGroup.SectionHeader>
  );
}

function footerSlot(props: GroupedListSectionProps): React.ReactNode {
  if (!props.footer) return null;

  return (
    <FieldGroup.SectionFooter>
      <FooterText text={props.footer} tone={props.tone} />
    </FieldGroup.SectionFooter>
  );
}

function HeaderText({ title }: { title: string }): React.JSX.Element {
  const headingModifiers = useSwiftUITextModifiers('heading');

  return (
    <Text
      modifiers={[
        ...headingModifiers,
        foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
        accessibilityAddTraits(['isHeader']),
      ]}
    >
      {title}
    </Text>
  );
}

function FooterText(props: {
  text: string;
  tone: GroupedListSectionProps['tone'];
}): React.JSX.Element {
  return <Text {...useFooterText(props.tone)}>{props.text}</Text>;
}

// A failure, such as a field's error, reads in the danger token, the one colour taken from Argo's theme rather than the Host.
function useFooterText(
  tone: GroupedListSectionProps['tone'],
): Pick<TextProps, 'textStyle' | 'modifiers'> {
  const swiftModifiers = useSwiftUITextModifiers('secondary');
  const textStyle = useUniversalTextStyle('secondary');
  const { danger } = useNativeTheme().colors;
  const color = tone === 'danger' ? danger : undefined;

  if (!ios) return { textStyle: { ...textStyle, color } };

  return { modifiers: [...swiftModifiers, ...failureColor(color)] };
}

function failureColor(
  color: string | undefined,
): ReturnType<typeof foregroundStyle>[] {
  return color === undefined ? [] : [foregroundStyle(color)];
}

GroupedListSection satisfies React.ComponentType<GroupedListSectionProps>;
