import { memo } from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { contentActionClass } from '#primitives/buttons/button';
import { Text, TextClassContext } from '#primitives/display/text';
import { Pressable } from '#primitives/pressable';
import { CompactSessionRow } from './session-row-compact';
import { SessionMark } from './session-row-mark';
import {
  SessionRowMetadata,
  type SessionRowMetadataProps,
} from './session-row-metadata';
import { SessionPlanBar } from './session-row-plan';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';

export type { SessionRowProps } from './session-row-props';

// Wide, a selected row sits pressed into the glass: the selected tint and an inset shadow, with no hairline.
const wideSelected = 'wide:bg-selected wide:shadow-inset';

/*
 * Regular: a phone card per Session, the grouped card's radius; wide, bare glass with a hairline edge
 * that hover tints. The row clips its Plan bar to its corners.
 */
function regularRowClass(selected: boolean): string {
  return contentActionClass({
    variant: 'ghost',
    className: cn(
      'relative h-auto sm:h-auto w-full items-start justify-start gap-3 overflow-hidden rounded-grouped bg-card px-4 py-3.5 wide:rounded-2xl wide:bg-transparent wide:py-2 wide:shadow-hairline',
      selected && wideSelected,
    ),
  });
}

function sessionRowPressProps(
  props: SessionRowProps,
  selected: boolean,
): React.ComponentProps<typeof Pressable> & { 'aria-pressed': boolean } {
  const { session, onSelect } = props;

  return {
    accessibilityLabel: sessionRowLabel(session),
    accessibilityState: { selected },
    'aria-pressed': selected,
    onPress: () => onSelect(session.sessionId),
    role: 'button',
    className: regularRowClass(selected),
  };
}

function SessionRowTrailing({ text }: { text?: string }): React.ReactNode {
  if (text === undefined) return null;

  return (
    <View className="shrink-0">
      <Text role="secondary">{text}</Text>
    </View>
  );
}

function SessionTitle({ title }: { title: string }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text numberOfLines={1} role="body">
        {title}
      </Text>
    </View>
  );
}

// The title, and any trailing text at the line's end.
function SessionRowTitle(props: {
  title: string;
  trailing?: string;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      <SessionTitle title={props.title} />
      <SessionRowTrailing text={props.trailing} />
    </View>
  );
}

function SessionRowContent(
  props: SessionRowMetadataProps & Pick<SessionRowProps, 'trailing'>,
): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <SessionRowTitle title={props.session.title} trailing={props.trailing} />
      <Text numberOfLines={1} role="secondary">
        {props.session.activity}
      </Text>
      <SessionRowMetadata {...props} />
    </View>
  );
}

function RegularRowParts(
  props: SessionRowProps & { selected: boolean },
): React.JSX.Element {
  const { session } = props;

  return (
    <>
      <SessionMark {...props} />
      <SessionRowContent {...props} />
      <SessionPlanBar plan={session.plan} status={session.status} />
    </>
  );
}

function RegularRow(props: SessionRowProps): React.JSX.Element {
  const selected = props.selected ?? false;

  return (
    <Pressable {...sessionRowPressProps(props, selected)}>
      <TextClassContext.Provider value={undefined}>
        <RegularRowParts {...props} selected={selected} />
      </TextClassContext.Provider>
    </Pressable>
  );
}

export const SessionRow = memo(function SessionRow(props: SessionRowProps) {
  if (props.layout === 'compact') return <CompactSessionRow {...props} />;

  return <RegularRow {...props} />;
});
