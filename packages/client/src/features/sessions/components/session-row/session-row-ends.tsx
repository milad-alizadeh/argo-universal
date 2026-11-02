import { Text } from '@repo/kit/primitives/content/text';
import type { ListItemProps } from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import { View } from 'react-native';
import type { SessionRowProps } from './session-row-props';
import { sidebarRows } from './session-row-sidebar';
import { rowStatusDot } from './session-row-status';

type RegularEnds = Pick<ListItemProps, 'trailing' | 'titleEnd' | 'subtitleEnd'>;

export const endParts = (
  detail: React.ReactNode,
  status: React.ReactNode,
): React.ReactNode =>
  [detail, status].some((part) => part !== undefined) ? (
    <View className="flex-row items-center gap-1.5">
      {detail}
      {status}
    </View>
  ) : undefined;

const timeOf = (age: string | undefined): React.ReactNode =>
  age === undefined ? undefined : <Text role="row-detail">{age}</Text>;

// A phone's row ends its title line on the time and its subtitle on the dot; with no subtitle, the dot follows the time.
function phoneEnds(
  { session, age }: SessionRowProps,
  subtitle: string | undefined,
): RegularEnds {
  const time = timeOf(age);
  const dot = rowStatusDot(session.status);

  return subtitle === undefined
    ? { titleEnd: endParts(time, dot) }
    : { titleEnd: time, subtitleEnd: dot };
}

// A sidebar row's status dot ends its title line, and its time leads the meta line.
export const regularEnds = (
  props: SessionRowProps,
  subtitle: string | undefined,
): RegularEnds =>
  sidebarRows
    ? { trailing: rowStatusDot(props.session.status) }
    : phoneEnds(props, subtitle);
