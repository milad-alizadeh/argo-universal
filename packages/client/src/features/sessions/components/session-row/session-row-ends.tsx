import { Text } from '@repo/kit/primitives/content/text';
import type { ListItemProps } from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import { View } from 'react-native';
import {
  type CalledRowProps,
  SessionRowCallMark,
  type SessionRowCall,
} from './session-row-call';
import { quietAge, type SessionRowProps } from './session-row-props';
import { sidebarRows } from './session-row-sidebar';
import { rowStatusDot } from './session-row-status';

type RegularEnds = Pick<ListItemProps, 'trailing' | 'titleEnd'>;

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

// A row's time in its detail style: a phone row's title end, or a Compact row's detail.
export const timeOf = (age: string | undefined): React.ReactNode =>
  age === undefined ? undefined : <Text role="row-detail">{age}</Text>;

const sidebarTimeOf = (age: string | undefined): React.ReactNode =>
  age === undefined ? undefined : (
    <Text role="secondary" tone="muted">
      {age}
    </Text>
  );

// A row ends its title line on the time, while the Session is quiet, then the status dot.
const statusEnds = (props: SessionRowProps): RegularEnds => {
  const dot = rowStatusDot(props.session.status);

  return sidebarRows
    ? { trailing: endParts(sidebarTimeOf(quietAge(props)), dot) }
    : { titleEnd: endParts(timeOf(quietAge(props)), dot) };
};

// While a Voice call is attached, its mark ends the title line in place of the status dot and the time.
const callEnds = (call: SessionRowCall): RegularEnds => {
  const mark = <SessionRowCallMark call={call} />;

  return sidebarRows ? { trailing: mark } : { titleEnd: mark };
};

export const regularEnds = (
  props: SessionRowProps & CalledRowProps,
): RegularEnds => (props.call ? callEnds(props.call) : statusEnds(props));
