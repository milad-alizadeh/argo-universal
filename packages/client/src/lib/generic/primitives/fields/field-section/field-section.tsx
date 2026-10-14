import type * as React from 'react';
import { useId } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import {
  FooterProvider,
  type SectionFooter,
} from '#primitives/fields/field-description';
import { useNavigationFields } from '#primitives/fields/field-layout';
import { cn } from '../../../utils';
import type { FieldSectionProps } from './field-section-props';

export function FieldSection(props: FieldSectionProps): React.JSX.Element {
  const footerId = useId();

  return (
    <View className="gap-2 wide:gap-3">
      <SectionTitle title={props.title} />
      <SectionRows {...props} footerId={footerId} />
      <SectionFooter
        id={footerId}
        text={props.footer}
        tone={props.footerTone}
      />
    </View>
  );
}

function SectionRows(
  props: FieldSectionProps & { footerId: string },
): React.JSX.Element {
  const navigation = useNavigationFields();

  return (
    <View className={rowsClasses(navigation)}>
      <FooterProvider value={footerOf(props, props.footerId)}>
        {props.children}
      </FooterProvider>
    </View>
  );
}

const rowsClasses = (navigation: boolean): string =>
  cn(
    'overflow-hidden rounded-2xl',
    // Wide, a navigation list's selected and hovered rows keep a 1px gap from their neighbours.
    navigation && 'rounded-none bg-transparent wide:gap-px',
  );

const footerOf = (
  props: FieldSectionProps,
  id: string,
): SectionFooter | undefined =>
  props.footer
    ? { id, failure: props.footerTone === 'destructive' }
    : undefined;

type FooterProps = {
  id: string;
  text?: string;
  tone?: FieldSectionProps['footerTone'];
};

function SectionFooter(props: FooterProps): React.JSX.Element | null {
  return props.text ? <FooterText {...props} text={props.text} /> : null;
}

// A failure, such as a field's error, reads in the destructive colour and is announced.
function FooterText(props: FooterProps & { text: string }): React.JSX.Element {
  const failure = props.tone === 'destructive';

  return (
    <Text
      id={props.id}
      role="secondary"
      semanticRole={failure ? 'alert' : undefined}
      className={cn('px-4', failure && 'text-destructive')}
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
        semanticRole="heading"
        aria-level={2}
        role="heading"
        className="text-muted-foreground wide:font-medium wide:text-foreground"
      >
        {title}
      </Text>
    </View>
  );
}
