import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';
import { IconButton } from '#primitives/actions/icon-button';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';

export type ElicitationHeaderProps = {
  title: string;
  // What to do and where in the questions, such as "Choose one · 2 of 3".
  progress?: string;
  // The question pager, when the request asks more than one.
  pager?: ReactNode;
  inactive: boolean;
  onDismiss: () => void;
};

export function ElicitationHeader(props: ElicitationHeaderProps): ReactElement {
  const wide = useContentWide();

  return (
    <View className={cn('flex-row items-start gap-2 px-4', wide && 'px-3.5')}>
      <HeaderText {...props} />
      <View className="flex-row items-center shrink-0">
        {props.pager}
        {wide && <DismissButton {...props} />}
      </View>
    </View>
  );
}

function HeaderText(props: ElicitationHeaderProps): ReactElement {
  return (
    <View className={cn('min-w-0 flex-1 gap-0.5', useContentWide() && 'pt-1')}>
      <HeaderTitle title={props.title} />
      <HeaderLine text={props.progress} />
    </View>
  );
}

function HeaderTitle({ title }: { title: string }): ReactElement {
  return (
    <View className="flex-row items-start gap-2.5">
      <HeaderIcon />
      <Text
        role="heading"
        accessibilityRole="heading"
        aria-level={2}
        className="min-w-0 flex-1 ios:text-row ios:leading-row android:text-lg android:leading-6 android:font-medium text-foreground"
      >
        {title}
      </Text>
    </View>
  );
}

function HeaderIcon(): ReactElement {
  return (
    <Icon
      name="question-bubble"
      role="body"
      className="text-muted-foreground android:text-foreground"
    />
  );
}

// A secondary line set in from the icon, in line with the title.
function HeaderLine({ text }: { text?: string }): ReactElement | null {
  const wide = useContentWide();

  if (!text) return null;

  return (
    <Text
      role="secondary"
      className={cn('pl-7.5 text-muted-foreground', wide && 'pl-6.5')}
    >
      {text}
    </Text>
  );
}

// Wide, the tray has no sheet to swipe away, so the header closes it.
function DismissButton(props: ElicitationHeaderProps): ReactElement {
  return (
    <IconButton
      icon="close"
      variant="ghost"
      accessibilityLabel="Dismiss"
      disabled={props.inactive}
      className="w-6 h-7 sm:w-6 sm:h-7"
      iconClassName="text-muted-foreground"
      onPress={props.onDismiss}
    />
  );
}
