import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';

export type HeadingContent = { title: ReactNode; actions: ReactNode };

type HeadingLayoutProps = HeadingContent & { stacked: boolean };

/*
 * A plain heading's title and buttons. Larger text grows the title past the row's height and past the width a narrow
 * column leaves beside its buttons, so the buttons then take a row of their own below it. The last icon's glyph ends on
 * the page's right edge, its button's 8 past it.
 */
export function HeadingLayout(props: HeadingLayoutProps): ReactElement {
  if (props.stacked) return <StackedHeading {...props} />;

  return (
    <View className="-mr-2 h-10 flex-row items-center gap-1">
      <View className="min-w-0 flex-1">{props.title}</View>
      {props.actions}
    </View>
  );
}

function StackedHeading(props: HeadingContent): ReactElement {
  return (
    <View className="items-start gap-1">
      <View className="min-w-0 self-stretch">{props.title}</View>
      <View className="flex-row items-center gap-1">{props.actions}</View>
    </View>
  );
}
