import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import type { IconName } from '../../../../lib/generic/symbols/icon-names';

interface RequestHeadingProps {
  icon: IconName;
  title: string;
  hint?: string;
  trailing?: ReactNode;
}

export function RequestHeading(props: RequestHeadingProps): ReactNode {
  return (
    <View className="flex-row items-start gap-2 px-4 wide:px-3.5">
      <View className="w-0 min-w-0 flex-1 gap-0.5">
        <HeadingTitle icon={props.icon} title={props.title} />
        <HeadingHint hint={props.hint} />
      </View>
      {props.trailing}
    </View>
  );
}

function HeadingTitle({
  icon,
  title,
}: Pick<RequestHeadingProps, 'icon' | 'title'>): ReactNode {
  return (
    <View className="flex-row items-start gap-2.5">
      <Icon
        name={icon}
        role="body"
        className="shrink-0 text-muted-foreground"
      />
      <HeadingText title={title} />
    </View>
  );
}

function HeadingText({ title }: Pick<RequestHeadingProps, 'title'>): ReactNode {
  return (
    <Text
      role="heading"
      semanticRole="heading"
      aria-level={2}
      className="min-w-0 flex-1 ios:type-nav-title"
    >
      {title}
    </Text>
  );
}

function HeadingHint({ hint }: Pick<RequestHeadingProps, 'hint'>): ReactNode {
  return (
    hint && (
      <Text
        role="secondary"
        className="pl-7.5 wide:pl-6.5 text-muted-foreground ios:text-[15px]"
      >
        {hint}
      </Text>
    )
  );
}
