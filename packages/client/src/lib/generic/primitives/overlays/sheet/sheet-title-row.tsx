import type { ReactElement } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';

interface TitleRowProps {
  title?: string;
  // A pushed page's way back to the page below it.
  backLabel?: string;
  onBack: () => void;
}

// A page's title, centred, with Back before it on a pushed page.
export function SheetTitleRow(props: TitleRowProps): ReactElement {
  return (
    <View className="h-13 shrink-0 flex-row items-center px-4">
      <BackSlot {...props} />
      <Text
        role="control"
        accessibilityRole="heading"
        className="flex-1 text-center"
      >
        {props.title}
      </Text>
      <View className="size-11" />
    </View>
  );
}

function BackSlot(props: TitleRowProps): ReactElement {
  return (
    <View className="size-11 items-center justify-center">
      <BackButton {...props} />
    </View>
  );
}

function BackButton(props: TitleRowProps): ReactElement | null {
  if (!props.backLabel) return null;

  return (
    <IconButton
      variant="ghost"
      icon="chevron-left"
      iconRole="title"
      accessibilityLabel={props.backLabel}
      onPress={props.onBack}
    />
  );
}
