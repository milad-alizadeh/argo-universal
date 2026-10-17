import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';

export interface PlaceholderProps {
  title: string;
  description: string;
}

// Paper "Placeholder / Default": a centred title and description where a pane has nothing to show, such as an empty detail.
export function Placeholder(props: PlaceholderProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6">
      <PlaceholderTitle title={props.title} />
      <Text role="secondary" className="text-center">
        {props.description}
      </Text>
    </View>
  );
}

function PlaceholderTitle({ title }: { title: string }): React.JSX.Element {
  return (
    <Text
      accessibilityRole="heading"
      aria-level={1}
      role="heading"
      className="text-center"
    >
      {title}
    </Text>
  );
}
