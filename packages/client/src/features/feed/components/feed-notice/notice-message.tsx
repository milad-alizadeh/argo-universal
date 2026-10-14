import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { ShimmerText } from '../shimmer-text';

interface Appearance {
  icon: IconName;
  color: string;
}

const noticeAppearance = new Map<string, Appearance>([
  ['info', { icon: 'info', color: 'text-muted-foreground' }],
  ['warning', { icon: 'warning', color: 'text-warning' }],
  ['error', { icon: 'failed', color: 'text-danger' }],
]);

const unrecognisedAppearance: Appearance = {
  icon: 'question',
  color: 'text-muted-foreground',
};

export const isKnownSeverity = (severity: string): boolean =>
  noticeAppearance.has(severity);

export interface NoticeMessageProps {
  severity: string;
  title: string;
  description?: string;
  excerpt?: string;
  // Replaces the severity's icon, for status rows such as Compaction.
  icon?: IconName;
  // Shimmers the title while the work it names runs.
  live?: boolean;
}

function appearanceOf({ severity, icon }: NoticeMessageProps): Appearance {
  const appearance = noticeAppearance.get(severity) ?? unrecognisedAppearance;

  return { icon: icon ?? appearance.icon, color: appearance.color };
}

const noticeRowProps = ({
  severity,
  title,
}: NoticeMessageProps): ViewProps => ({
  role: severity === 'error' ? 'alert' : 'status',
  accessibilityLabel: `${severity}: ${title}`,
  className: 'min-h-6 flex-row items-start gap-1.5 wide:min-h-5',
});

function NoticeIcon({ icon, color }: Appearance): React.JSX.Element {
  return (
    <View className="h-6 shrink-0 items-center justify-center wide:h-5">
      <Icon name={icon} role="body" className={color} />
    </View>
  );
}

function NoticeTitle({
  title,
  live,
  color,
}: Pick<NoticeMessageProps, 'title' | 'live'> & {
  color: string;
}): React.JSX.Element {
  if (live) return <ShimmerText text={title} className="type-body" />;

  return (
    <Text numberOfLines={1} className={color}>
      {title}
    </Text>
  );
}

function NoticeDescription({
  description,
}: Pick<NoticeMessageProps, 'description'>): React.JSX.Element | null {
  if (!description) return null;

  return <Text className="text-muted-foreground">{description}</Text>;
}

function NoticeExcerpt({
  excerpt,
}: Pick<NoticeMessageProps, 'excerpt'>): React.JSX.Element | null {
  if (!excerpt) return null;

  return (
    <Text
      selectable
      numberOfLines={1}
      role="code"
      className="text-muted-foreground"
    >
      {excerpt}
    </Text>
  );
}

export function NoticeMessage(props: NoticeMessageProps): React.JSX.Element {
  const appearance = appearanceOf(props);

  return (
    <View {...noticeRowProps(props)}>
      <NoticeIcon {...appearance} />
      <View className="min-w-0 flex-1 gap-0.5">
        <NoticeTitle {...props} color={appearance.color} />
        <NoticeDescription description={props.description} />
        <NoticeExcerpt excerpt={props.excerpt} />
      </View>
    </View>
  );
}
