import { memo } from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { Text, TextClassContext } from '#primitives/content/text';
import type { ContextMenuTriggerProps } from '#primitives/overlays/menu';
import { CompactSessionRow } from './session-row-compact';
import { SessionMark } from './session-row-mark';
import { SessionRowMenu } from './session-row-menu';
import {
  SessionRowMetadata,
  type SessionRowMetadataProps,
} from './session-row-metadata';
import { SessionPlanBar } from './session-row-plan';
import { type SessionRowProps, sessionRowLabel } from './session-row-props';

export type { SessionRowProps } from './session-row-props';

// Wide on the web and desktop, a selected row sits pressed into the glass: the selected tint and an inset shadow.
const wideSelected = 'web:wide:bg-selected web:wide:shadow-inset';

/*
 * Regular: a phone card per Session, the grouped card's radius, Paper's "SessionRow (ios)". Wide on the web and
 * desktop, bare glass with a hairline edge that hover tints. A tablet has no glass, so its rows stay the phone's
 * cards at every width, with no selected state, as a phone's. The row clips its Plan bar.
 */
function regularRowClass(selected: boolean): string {
  return contentActionClass({
    variant: 'ghost',
    className: cn(
      'relative h-auto sm:h-auto w-full items-start justify-start gap-3 overflow-hidden rounded-grouped bg-card px-4 py-3.5 web:wide:rounded-2xl web:wide:bg-transparent web:wide:py-2 web:wide:shadow-hairline',
      selected && wideSelected,
    ),
  });
}

// The row's press, and the long press its context menu hands it on Android.
type SessionRowPressProps = SessionRowProps & ContextMenuTriggerProps;

function sessionRowPressProps(
  props: SessionRowPressProps,
  selected: boolean,
): React.ComponentProps<typeof Pressable> & { 'aria-pressed': boolean } {
  const { session, onSelect } = props;

  return {
    accessibilityLabel: sessionRowLabel(session),
    accessibilityState: { selected },
    'aria-pressed': selected,
    onPress: () => onSelect(session.sessionId),
    onLongPress: props.onLongPress,
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

function RegularRow(props: SessionRowPressProps): React.JSX.Element {
  const selected = props.selected ?? false;

  return (
    <Pressable {...sessionRowPressProps(props, selected)}>
      <TextClassContext.Provider value={undefined}>
        <RegularRowParts {...props} selected={selected} />
      </TextClassContext.Provider>
    </Pressable>
  );
}

function SessionRowLayout(props: SessionRowPressProps): React.JSX.Element {
  if (props.layout === 'compact') return <CompactSessionRow {...props} />;

  return <RegularRow {...props} />;
}

export const SessionRow = memo(function SessionRow(props: SessionRowProps) {
  return (
    <SessionRowMenu {...props}>
      <SessionRowLayout {...props} />
    </SessionRowMenu>
  );
});
