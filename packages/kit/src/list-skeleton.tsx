import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';

const bar = 'self-start max-w-full overflow-hidden rounded-sm bg-foreground/5';

// The bar keeps a title line's height, so a loading field is as tall as the row it stands in for.
const line = 'h-6 wide-type:h-5';

const barHeight = 'h-3 wide-type:h-2.5';

interface SkeletonBarProps {
  text: ReactNode;
}

// Android's Text role colour outranks text-transparent, so there the words are hidden by opacity instead.
function HiddenText({ text }: SkeletonBarProps): ReactElement {
  return (
    <Text
      role="row"
      numberOfLines={1}
      aria-hidden
      className="text-transparent android:opacity-0"
    >
      {text}
    </Text>
  );
}

// A muted bar as wide as its hidden placeholder text, so each loading field can differ.
export function SkeletonBar(props: SkeletonBarProps): ReactNode {
  if (props.text === undefined) return null;

  return (
    <View className={`justify-center ${line}`}>
      <View className={`${bar} ${barHeight}`}>
        <HiddenText {...props} />
      </View>
    </View>
  );
}
