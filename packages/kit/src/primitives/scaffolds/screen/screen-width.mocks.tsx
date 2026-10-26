import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { Card } from '#primitives/layout/card';
import { Screen, type ScreenProps } from './index';

export const widthContent = 'width-content';

const placeholder =
  'Placeholder text long enough to run the width of the column it sits in, so a reading column and a full one draw apart on a wide window.';

// Content that does not scroll, so the Screen keeps it to its column: the card starts on the title's edge and runs as wide as the column.
export function WidthExample({
  width,
}: Pick<ScreenProps, 'width'>): ReactElement {
  return (
    <Screen title="Title" caption="Caption" width={width}>
      <View testID={widthContent}>
        <Card title="Card">
          <Text>{placeholder}</Text>
        </Card>
      </View>
    </Screen>
  );
}
