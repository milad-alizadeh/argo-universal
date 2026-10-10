import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '../utils';
import { useNavigationFields } from './field-layout';
import type { FieldSectionProps } from './field-props';
import { Text } from './text';

export function FieldSection(props: FieldSectionProps): React.JSX.Element {
  const navigation = useNavigationFields();
  return (
    <View className="gap-2 wide:gap-0.5">
      <SectionTitle title={props.title} />
      <View
        className={cn(
          'overflow-hidden rounded-[28px] bg-muted',
          navigation && 'rounded-none bg-transparent gap-0.5',
        )}
      >
        {props.children}
      </View>
      {props.footer && (
        <Text role="secondary" className="px-4 wide:px-2.5">
          {props.footer}
        </Text>
      )}
    </View>
  );
}

function SectionTitle({ title }: { title?: string }): React.JSX.Element | null {
  if (!title) return null;
  return (
    <View className="min-h-7 justify-center px-4 wide:min-h-8 wide:px-2.5">
      <Text
        semanticRole="heading"
        aria-level={2}
        role="heading"
        className="text-muted-foreground wide:text-foreground"
      >
        {title}
      </Text>
    </View>
  );
}
