import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';

export interface PageTitleProps {
  title: string;
  // An image before the title, and a badge after it, such as an Agent's icon and status.
  icon?: ReactNode;
  badge?: ReactNode;
}

// A page's own title, the top heading on the page, on one line.
export function PageTitle({
  title,
  icon,
  badge,
}: PageTitleProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <PageHeading title={title} />
      {badge}
    </View>
  );
}

function PageHeading({
  title,
}: Pick<PageTitleProps, 'title'>): React.JSX.Element {
  return (
    <Text
      role="title"
      semanticRole="heading"
      aria-level={1}
      numberOfLines={1}
      className="min-w-0 shrink"
    >
      {title}
    </Text>
  );
}
