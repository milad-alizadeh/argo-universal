import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { DisclosureChevron } from '@repo/kit/primitives/status/disclosure-chevron';
import type { IconName } from '@repo/kit/symbols/icon-names';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useWorkbenchTitlePadding } from './use-workbench-title-padding';

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
      <Animated.View
        className="flex-row items-center gap-2 pt-3 pr-4 pl-1"
        style={useWorkbenchTitlePadding(props.expanded)}
      >
        <TitleContents {...props} />
      </Animated.View>
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
  className: 'rounded-2xl',
});

function TitleContents(props: WorkbenchCollapsibleTitleProps): ReactElement {
  return (
    <>
      <TitleLabel {...props} />
      <TitleDisclosure expanded={props.expanded} />
      <View className="flex-1" />
      {props.summary}
    </>
  );
}

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
