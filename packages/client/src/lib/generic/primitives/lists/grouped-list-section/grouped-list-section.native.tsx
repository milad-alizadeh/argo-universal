import { Column, FieldGroup, Text, type TextProps } from '@expo/ui';
import { fillMaxWidth, padding } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityAddTraits,
  foregroundStyle,
  headerProminence,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import type { TextRole } from '#primitives/display/text';
import { useSidebarList } from '#primitives/fields/field-layout';
import {
  useSwiftUITextModifiers,
  useUniversalTextStyle,
} from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import type { GroupedListSectionProps } from './grouped-list-section-props';
import { GroupedListSection as WebGroupedListSection } from './grouped-list-section.tsx';

const gutter = 16;

const captionPadding = 4;

const captionGap = 8;

const ios = Platform.OS === 'ios';

export function GroupedListSection(
  props: GroupedListSectionProps,
): React.JSX.Element {
  const bare = useBareSection(props);

  if (useWide()) return <WebGroupedListSection {...props} />;

  return bare ? <BareSection {...props} /> : <Section {...props} />;
}

// Android's Section puts every row on a filled tile; bare fields and a flat sidebar want none.
function useBareSection(props: GroupedListSectionProps): boolean {
  const sidebar = useSidebarList();

  return !ios && (!!props.textFields || sidebar);
}

/*
 * Increased prominence keeps an iOS header in title case, as Paper's is; without it Form uppercases
 * the header. It changes no separator, row fill or page colour; the header sets its own font.
 */
function Section(props: GroupedListSectionProps): React.JSX.Element {
  return (
    <FieldGroup.Section
      title={ios ? undefined : props.title}
      modifiers={ios ? [headerProminence('increased')] : undefined}
    >
      {headerSlot(props.title)}
      {footerSlot(props)}
      {props.children}
    </FieldGroup.Section>
  );
}

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

/*
 * Android's text fields stand bare, apart by Material's field spacing, each saying its own hint or
 * error, so the section draws no footer; a sidebar's rows sit flat and together.
 */
function BareSection(props: GroupedListSectionProps): React.JSX.Element {
  const footer = props.textFields ? undefined : props.footer;

  return (
    <Column spacing={captionGap} modifiers={fullWidth}>
      <Caption text={props.title} textRole="heading" />
      <Column spacing={useRowGap(props.textFields)} modifiers={fullWidth}>
        {props.children}
      </Column>
      <Caption text={footer} textRole="secondary" />
    </Column>
  );
}

const fullWidth = [fillMaxWidth()];

function useRowGap(textFields: boolean | undefined): number {
  const { gap } = useResolveClassNames('gap-4');

  return textFields && typeof gap === 'number' ? gap : 0;
}

function Caption(props: {
  text?: string;
  textRole: TextRole;
}): React.JSX.Element | null {
  const textStyle = useUniversalTextStyle(props.textRole);

  if (!props.text) return null;

  return (
    <Text
      textStyle={textStyle}
      modifiers={[padding(gutter, captionPadding, gutter, captionPadding)]}
    >
      {props.text}
    </Text>
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
