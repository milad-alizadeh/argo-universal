import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { StatusDot } from '#primitives/status/status-dot';
import type { ListItemProps } from './list-item-props';

export type SubtitleProps = Pick<
  ListItemProps,
  | 'subtitleTone'
  | 'subtitleDimmed'
  | 'subtitleLines'
  | 'subtitleIcon'
  | 'subtitleIconTone'
> & {
  text?: string;
  multiline?: boolean;
};

const subtitleLines = (props: SubtitleProps): number | undefined =>
  props.multiline ? undefined : (props.subtitleLines ?? 1);

export function Subtitle(props: SubtitleProps): ReactNode {
  if (props.text === undefined) return null;

  if (props.subtitleIcon === undefined) return <SubtitleText {...props} />;

  return (
    <View className="min-w-0 flex-row items-center gap-1">
      <SubtitleMark {...props} subtitleIcon={props.subtitleIcon} />
      <View className="min-w-0 flex-1">
        <SubtitleText {...props} />
      </View>
    </View>
  );
}

// A `dot` is a status dot, 8px as everywhere else, not a glyph that fills an icon's box.
function SubtitleMark(
  props: Required<Pick<SubtitleProps, 'subtitleIcon'>> & SubtitleProps,
): ReactNode {
  if (props.subtitleIcon !== 'dot') {
    return <Icon name={props.subtitleIcon} tone={props.subtitleIconTone} />;
  }

  return (
    <StatusDot
      tone={props.subtitleIconTone ?? 'muted'}
      pulse={false}
      testID="icon-dot"
    />
  );
}

function SubtitleText(props: SubtitleProps): ReactElement {
  return (
    <Text
      role="row-detail"
      tone={props.subtitleTone}
      dimmed={props.subtitleDimmed}
      numberOfLines={subtitleLines(props)}
    >
      {props.text}
    </Text>
  );
}
