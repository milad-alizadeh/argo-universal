import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type { ListSectionProps } from './list-props';

type HeaderProps = Omit<ListSectionProps, 'children'>;

export function ListSection(props: ListSectionProps): ReactNode {
  return props.children;
}

function headerPress(
  props: HeaderProps,
): React.ComponentProps<typeof Pressable> {
  if (!props.onExpandedChange) return {};

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
      <Text role="heading" aria-level={2}>
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
      className="flex-row items-center gap-3 px-4 py-3 wide:px-5"
    >
      <HeaderLeading {...props} />
      <HeaderContent {...props} />
      {props.trailing}
    </Pressable>
  );
}

export function SectionFooter({ text }: { text: string }): ReactElement {
  return (
    <View className="px-4 py-2 wide:px-5">
      <Text role="secondary" tone="muted">
        {text}
      </Text>
    </View>
  );
}
