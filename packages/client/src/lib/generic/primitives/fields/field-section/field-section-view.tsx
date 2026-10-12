import type * as React from 'react';
import { useId } from 'react';
import { View } from 'react-native';
import { cn } from '../../../utils';
import { Text } from '../../display/text/text';
import { FooterIdProvider } from '../field-footer';
import { useNavigationFields } from '../field-layout';
import type { FieldSectionProps } from '../field-props';

export function FieldSection(props: FieldSectionProps): React.JSX.Element {
  const navigation = useNavigationFields();
  const footerId = useId();
  return (
    <View className="gap-2 wide:gap-3">
      <SectionTitle title={props.title} />
      <View
        className={cn(
          'overflow-hidden rounded-2xl',
          navigation && 'rounded-none bg-transparent',
        )}
      >
        <FooterIdProvider value={props.footer ? footerId : undefined}>
          {props.children}
        </FooterIdProvider>
      </View>
      <SectionFooter
        id={footerId}
        text={props.footer}
        tone={props.footerTone}
      />
    </View>
  );
}

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
