import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import { PhoneTitle } from './navigation/phone-title';
import { PageHeader } from './page-header';

interface PlaceholderProps {
  title: string;
  description: string;
}

export function Placeholder(props: PlaceholderProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-content">
      <PhoneTitle title={props.title} />
      <PageHeader title={props.title} />
      <PlaceholderBody {...props} />
    </View>
  );
}

function PlaceholderBody(props: PlaceholderProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-2 px-gutter py-6">
      <Text accessibilityRole="heading" aria-level={1} role="title">
        {props.title}
      </Text>
      <Text role="secondary" className="text-center">
        {props.description}
      </Text>
    </View>
  );
}
