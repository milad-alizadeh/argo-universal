import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type { ListSectionProps } from './list-props';

type HeaderProps = Omit<ListSectionProps, 'children'>;

function headerPress(
  props: HeaderProps,
): React.ComponentProps<typeof Pressable> {
  if (!props.onExpandedChange) return { tabIndex: -1 };

  return {
    role: 'button',
    accessibilityState: { expanded: props.isExpanded },
    'aria-expanded': props.isExpanded ?? true,
    onPress: () => props.onExpandedChange?.(!(props.isExpanded ?? true)),
  };
}

const disclosureIcon = (
  isExpanded?: boolean,
): 'chevron-right' | 'chevron-down' =>
  isExpanded === false ? 'chevron-right' : 'chevron-down';

function HeaderLeading(props: HeaderProps): ReactNode {
  if (props.leading !== undefined) return props.leading;

  if (!props.onExpandedChange) return null;

  return <Icon role="body" name={disclosureIcon(props.isExpanded)} />;
}

function HeaderContent(props: HeaderProps): ReactElement {
  return (
    <View className="min-w-0 flex-1">
      <Text role="heading" accessibilityRole="heading" aria-level={2}>
        {props.title}
      </Text>
      {props.subtitle ? (
        <Text role="secondary" tone="muted">
          {props.subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function SectionHeader(props: HeaderProps): ReactElement {
  return (
    <Pressable
      {...headerPress(props)}
      className="flex-row items-center gap-3 px-4 pb-2.5 wide:px-5"
    >
      <HeaderLeading {...props} />
      <HeaderContent {...props} />
      {props.trailing}
    </Pressable>
  );
}

export function hasSectionHeader(props: ListSectionProps): boolean {
  return [
    props.title,
    props.leading,
    props.trailing,
    props.onExpandedChange,
  ].some(Boolean);
}
