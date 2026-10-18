import type * as React from 'react';
import { useId } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import {
  FooterProvider,
  type SectionFooter,
} from '#primitives/fields/field-description';
import {
  useOverlayList,
  useSidebarList,
} from '#primitives/fields/field-layout';
import { cn } from '../../../utils';
import type { GroupedListSectionProps } from './grouped-list-section-props';

export function GroupedListSection(
  props: GroupedListSectionProps,
): React.JSX.Element {
  const footerId = useId();
  const footer = { id: footerId, text: props.footer, tone: props.tone };

  return (
    <View>
      <SectionTitle title={props.title} />
      <SectionRows {...props} footerId={footerId} />
      <SectionFooter {...footer} />
    </View>
  );
}

function SectionRows(
  props: GroupedListSectionProps & { footerId: string },
): React.JSX.Element {
  const sidebar = useSidebarList();
  const overlay = useOverlayList();

  return (
    <View className={rowsClasses(sidebar, overlay, props.cardless)}>
      <FooterProvider value={footerOf(props, props.footerId)}>
        {props.children}
      </FooterProvider>
    </View>
  );
}

const rowsClasses = (
  sidebar: boolean,
  overlay: boolean,
  cardless?: boolean,
): string =>
  cn(
    cardClasses(cardless, overlay),
    // In a desktop popover, rows keep Android's grouped-row gap so hovered and pressed tiles never touch.
    overlay && 'gap-0.5',
    // Wide, a sidebar list's selected and hovered rows keep a 1px gap from their neighbours.
    sidebar && 'rounded-none bg-transparent wide:gap-px',
  );

/*
 * The card's corners clip its rows; content with no card keeps every letter. A grouped card takes
 * iOS's 26 corner on the nearest Tailwind step, 24 (rounded-3xl); a popover's card keeps the
 * container radius.
 */
function cardClasses(
  cardless?: boolean,
  overlay?: boolean,
): string | undefined {
  if (cardless) return undefined;

  return cn('overflow-hidden', overlay ? 'rounded-2xl' : 'rounded-3xl');
}

const footerOf = (
  props: GroupedListSectionProps,
  id: string,
): SectionFooter | undefined =>
  props.footer ? { id, failure: props.tone === 'danger' } : undefined;

type FooterProps = {
  id: string;
  text?: string;
  tone?: GroupedListSectionProps['tone'];
};

function SectionFooter(props: FooterProps): React.JSX.Element | null {
  return props.text ? <FooterText {...props} text={props.text} /> : null;
}

// A failure, such as a field's error, reads in the danger colour and is announced.
function FooterText(props: FooterProps & { text: string }): React.JSX.Element {
  const failure = props.tone === 'danger';
  const captions = useCaptionClasses();

  return (
    <Text
      id={props.id}
      role="secondary"
      accessibilityRole={failure ? 'alert' : undefined}
      className={cn(captions, 'pt-2', failure && 'text-danger')}
    >
      {props.text}
    </Text>
  );
}

/*
 * As a stock iOS 26 Form's captions: in line with the rows' text margin M (16 on a phone, 20 from
 * medium up), the header 10 above the card and the footer 8 below it.
 */
function useCaptionClasses(): string {
  const sidebar = useSidebarList();
  const overlay = useOverlayList();

  return cn('px-4', !sidebar && !overlay && 'wide:px-5');
}

function SectionTitle({ title }: { title?: string }): React.JSX.Element | null {
  const captions = useCaptionClasses();

  if (!title) return null;

  return (
    <View className={cn('justify-center pb-2.5', captions)}>
      <SectionHeading title={title} />
    </View>
  );
}

function SectionHeading({ title }: { title: string }): React.JSX.Element {
  return (
    <Text
      accessibilityRole="heading"
      aria-level={2}
      role="heading"
      className={useHeadingClasses()}
    >
      {title}
    </Text>
  );
}

// A grouped list's headings read in the secondary colour, as iOS's do; a wide sidebar's in the foreground.
function useHeadingClasses(): string {
  return cn(
    'text-muted-foreground',
    useSidebarList() && 'wide:font-medium wide:text-foreground',
  );
}

GroupedListSection satisfies React.ComponentType<GroupedListSectionProps>;
