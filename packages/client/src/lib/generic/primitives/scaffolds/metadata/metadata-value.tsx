import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Text, TextClassContext, toneClass } from '#primitives/content/text';

type ValueProps = { text: string; children?: ReactNode };

// Phones mute the value as a trailing detail, and the icon before it inherits that tone; desktop keeps foreground.
const valueTone = Platform.OS === 'web' ? undefined : 'muted';

export function MetadataText({ text, children }: ValueProps): ReactElement {
  return (
    <TextClassContext value={toneClass(valueTone)}>
      <View className="min-w-0 flex-row items-center gap-1.5">
        {children}
        <Text role="row" tone={valueTone} className="min-w-0 shrink">
          {text}
        </Text>
      </View>
    </TextClassContext>
  );
}
