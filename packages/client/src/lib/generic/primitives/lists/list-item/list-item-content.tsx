import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { cn } from '../../../utils';
import type { ListItemProps } from './list-item-props';

type SubtitleProps = Pick<ListItemProps, 'subtitleTone' | 'subtitleDimmed'> & {
  text?: string;
  multiline?: boolean;
};

function Subtitle(props: SubtitleProps): ReactNode {
  return props.text === undefined ? null : (
    <Text
      role="row-detail"
      tone={props.subtitleTone}
      dimmed={props.subtitleDimmed}
      numberOfLines={props.multiline ? undefined : 1}
    >
      {props.text}
    </Text>
  );
}

// Paper "SessionsList": a sidebar row's meta line sits 2 under its subtitle.
const metaClassName = (sidebar: boolean): string =>
  cn('min-w-0 flex-row items-center gap-3', sidebar ? 'pt-0.5' : 'pt-1');

function Meta(props: { children?: ReactNode; sidebar: boolean }): ReactNode {
  if (!props.children) return null;

  return <View className={metaClassName(props.sidebar)}>{props.children}</View>;
}

// A sidebar row's title is medium, or semibold while it holds news for its reader.
function titleWeight(
  props: Pick<ListItemProps, 'sidebar' | 'emphasized'>,
): string | undefined {
  if (props.emphasized) return 'font-semibold';

  return props.sidebar ? 'font-medium' : undefined;
}

function Title(props: ListItemProps & { inLine?: boolean }): ReactElement {
  return (
    <Text
      role="row"
      tone={props.titleTone ?? props.tone}
      numberOfLines={1}
      className={cn(props.inLine && 'min-w-0 flex-1', titleWeight(props))}
    >
      {props.title}
    </Text>
  );
}

// A Regular sidebar row ends its title line with its trailing item, 8 after the title, so the lines below run the full width.
function TitleLine(props: ListItemProps): ReactElement {
  if (!trailsTitle(props) || props.trailing === undefined)
    return <Title {...props} />;

  return (
    <View className="min-w-0 flex-row items-center gap-2">
      <Title {...props} inLine />
      <View className="shrink-0 flex-row items-center">{props.trailing}</View>
    </View>
  );
}

export const trailsTitle = (
  props: Pick<ListItemProps, 'sidebar' | 'value'>,
): boolean => props.sidebar === 'regular' && props.value === undefined;

export function ItemContent(props: ListItemProps): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <TitleLine {...props} />
      <Subtitle
        text={props.subtitle}
        multiline={!!props.description}
        subtitleTone={props.subtitleTone ?? 'muted'}
        subtitleDimmed={props.subtitleDimmed}
      />
      <Meta sidebar={props.sidebar !== undefined}>{props.meta}</Meta>
    </View>
  );
}
