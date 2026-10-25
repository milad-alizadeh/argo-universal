import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text, type TextRole } from '#primitives/content/text';

const bar = 'self-start max-w-full overflow-hidden rounded-sm bg-foreground/5';

// Each bar keeps its line's height, so a loading row is as tall as the row it stands in for.
const lines = {
  title: { line: 'h-6 wide-type:h-5', bar: 'h-3 wide-type:h-2.5' },
  subtitle: { line: 'h-5 wide-type:h-4', bar: 'h-2.5 wide-type:h-2' },
  meta: { line: 'h-6 pt-1 wide-type:h-5', bar: 'h-2.5 wide-type:h-2' },
} as const;

type SkeletonLine = keyof typeof lines;

interface SkeletonBarProps {
  kind: SkeletonLine;
  text: ReactNode;
  textRole?: TextRole;
}

function HiddenText({
  text,
  textRole = 'row',
}: SkeletonBarProps): ReactElement {
  return (
    <Text
      role={textRole}
      numberOfLines={1}
      aria-hidden
      className="opacity-0"
    >
      {text}
    </Text>
  );
}

// A muted bar as wide as its hidden placeholder text, so each loading row can differ.
export function SkeletonBar(props: SkeletonBarProps): ReactNode {
  if (props.text === undefined) return null;

  return (
    <View className={`justify-center ${lines[props.kind].line}`}>
      <View className={`${bar} ${lines[props.kind].bar}`}>
        <HiddenText {...props} />
      </View>
    </View>
  );
}

// The leading icon's place, as a round mark the size of the icon.
export function SkeletonMark(): ReactElement {
  return <View className="size-5 rounded-full bg-foreground/5 wide:size-4" />;
}

function DetailBar(props: Omit<SkeletonBarProps, 'textRole'>): ReactNode {
  return <SkeletonBar {...props} textRole="row-detail" />;
}

// A loading row's content lane: bars where its title, subtitle and meta lines will be.
export function SkeletonContent(props: {
  title?: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
}): ReactElement {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <SkeletonBar kind="title" text={props.title} />
      <DetailBar kind="subtitle" text={props.subtitle} />
      <DetailBar kind="meta" text={props.meta} />
    </View>
  );
}
