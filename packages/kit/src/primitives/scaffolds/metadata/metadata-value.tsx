import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text, TextClassContext, toneClass } from '#primitives/content/text';
import { useMetadataDrawing } from './metadata-drawing-context';

type ValueProps = { text: string; children?: ReactNode };

export function MetadataText({ text, children }: ValueProps): ReactElement {
  // The icon before the value inherits the muted tone.
  const valueTone = useMetadataDrawing().mutedValue ? 'muted' : undefined;

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
