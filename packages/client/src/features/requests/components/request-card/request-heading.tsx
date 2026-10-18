import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { useOptionalSheet } from '#primitives/overlays/sheet';
import type { IconName } from '../../../../lib/generic/symbols/icon-names';

interface RequestHeadingProps {
  icon: IconName;
  title: string;
  hint?: string;
  trailing?: ReactNode;
}

// In a phone's request sheet the sheet's own title names the request, so only the hint stays.
export function RequestHeading(props: RequestHeadingProps): ReactNode {
  if (useOptionalSheet()) return <HeadingHint hint={props.hint} />;

  return (
    <View className="flex-row items-start gap-2 px-4 wide:px-3.5">
      <View className="w-0 min-w-0 flex-1 gap-0.5">
        <HeadingTitle icon={props.icon} title={props.title} />
        <HeadingHint hint={props.hint} underIcon />
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
      accessibilityRole="heading"
      aria-level={2}
      className="min-w-0 flex-1 ios:type-nav-title"
    >
      {title}
    </Text>
  );
}

// Under the title, the hint lines up with the title's text past the icon.
function HeadingHint({
  hint,
  underIcon,
}: Pick<RequestHeadingProps, 'hint'> & { underIcon?: boolean }): ReactNode {
  const inset = underIcon && 'pl-7.5 wide:pl-6.5';

  return (
    hint && (
      <Text role="secondary" className={cn('text-muted-foreground', inset)}>
        {hint}
      </Text>
    )
  );
}
