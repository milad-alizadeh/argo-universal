import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text, TextClassContext, toneClass } from '#primitives/content/text';
import { usePropertiesDrawing } from './properties-place';

// The value is text, or a Link that carries the text itself.
type ValueProps = { text: ReactNode; children?: ReactNode };

export function PropertyText({ text, children }: ValueProps): ReactElement {
  // The icon before the value inherits the muted tone.
  const valueTone = usePropertiesDrawing().mutedValue ? 'muted' : undefined;

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
