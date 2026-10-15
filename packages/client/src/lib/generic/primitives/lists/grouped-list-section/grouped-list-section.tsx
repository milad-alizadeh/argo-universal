import type * as React from 'react';
import { useId } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import {
  FooterProvider,
  type SectionFooter,
} from '#primitives/fields/field-description';
import {
  useOverlayFields,
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
    <View className="gap-2 wide:gap-3">
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
  const overlay = useOverlayFields();

  return (
    <View className={overlay ? 'gap-0' : rowsClasses(sidebar)}>
      <FooterProvider value={footerOf(props, props.footerId)}>
        {props.children}
      </FooterProvider>
    </View>
  );
}

const rowsClasses = (sidebar: boolean): string =>
  cn(
    'overflow-hidden rounded-2xl',
    // Wide, a sidebar list's selected and hovered rows keep a 1px gap from their neighbours.
    sidebar && 'rounded-none bg-transparent wide:gap-px',
  );

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

  return (
    <Text
      id={props.id}
      role="secondary"
      accessibilityRole={failure ? 'alert' : undefined}
      className={cn('px-4', failure && 'text-danger')}
    >
      {props.text}
    </Text>
  );
}

function SectionTitle({ title }: { title?: string }): React.JSX.Element | null {
  if (!title) return null;

  return (
    <View className="justify-center px-4">
      <Text
        accessibilityRole="heading"
        aria-level={2}
        role="heading"
        className="text-muted-foreground wide:font-medium wide:text-foreground"
      >
        {title}
      </Text>
    </View>
  );
}

GroupedListSection satisfies React.ComponentType<GroupedListSectionProps>;
