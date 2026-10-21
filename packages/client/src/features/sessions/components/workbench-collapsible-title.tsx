import type { ReactElement, ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';
import type { IconName } from '../../../lib/generic/symbols/icon-names';

export interface WorkbenchCollapsibleTitleProps {
  title: string;
  icon: IconName;
  expanded?: boolean;
  onPress: () => void;
  // Display-only trailing content belongs to the same disclosure target.
  summary?: ReactNode;
}

// Paper WorkbenchCard header: fixed icon lane, title, disclosure and trailing summary.
export function WorkbenchCollapsibleTitle(
  props: WorkbenchCollapsibleTitleProps,
): ReactElement {
  return (
    <Pressable {...titleControlProps(props)}>
      <TitleLabel {...props} />
      <TitleDisclosure expanded={props.expanded} />
      <View className="flex-1" />
      {props.summary}
    </Pressable>
  );
}

const titleControlProps = (
  props: WorkbenchCollapsibleTitleProps,
): PressableProps => ({
  role: 'button',
  accessibilityLabel: actionLabel(props),
  'aria-expanded': props.expanded,
  onPress: props.onPress,
  className: cn(
    'flex-row items-center gap-2 rounded-2xl pt-3 pr-4 pl-1',
    props.expanded === false && 'pb-3',
  ),
});

function TitleLabel({
  title,
  icon,
}: WorkbenchCollapsibleTitleProps): ReactElement {
  return (
    <>
      <View className="w-7 shrink-0 items-center">
        <Icon name={icon} role="body" />
      </View>
      <Text role="heading" accessibilityRole="heading" aria-level={3}>
        {title}
      </Text>
    </>
  );
}

function TitleDisclosure({
  expanded,
}: Pick<WorkbenchCollapsibleTitleProps, 'expanded'>): ReactElement | null {
  if (expanded === undefined) return null;

  return (
    <View className="size-4 items-center justify-center">
      <DisclosureChevron open={expanded} />
    </View>
  );
}

function actionLabel({
  title,
  expanded,
}: WorkbenchCollapsibleTitleProps): string {
  if (expanded === undefined) return title;

  return `${expanded ? 'Collapse' : 'Expand'} ${title}`;
}
