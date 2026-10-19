import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/content/text';

type ValueProps = { text: string; children?: ReactNode };

function ValueText({ text }: Pick<ValueProps, 'text'>): ReactElement {
  return (
    <Text
      role="row"
      tone={Platform.OS === 'web' ? undefined : 'muted'}
      className="min-w-0 shrink"
    >
      {text}
    </Text>
  );
}

export function MetadataText({ text, children }: ValueProps): ReactElement {
  return (
    <View className="min-w-0 flex-row items-center gap-1.5">
      {children}
      <ValueText text={text} />
    </View>
  );
}
