import type * as React from 'react';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';
import type { DiffLine, FileDiff } from '../../view/file-diff';
import { lineStyles } from './diff-lines';

type Hunk = FileDiff['hunks'][number];

interface HunksProps {
  hunks: readonly Hunk[];
  inline: boolean;
}

interface LineProps {
  line: DiffLine;
  inline: boolean;
}

const lineNumberClassName = ({ line, inline }: LineProps): string =>
  cn(
    'shrink-0 text-right',
    lineStyles[line.kind].color,
    inline ? 'w-7' : 'w-9',
  );

const lineKey = (line: DiffLine): string => `${line.kind}:${line.text}`;

function LineNumber(props: LineProps): React.JSX.Element {
  return (
    <Text role="code" className={lineNumberClassName(props)}>
      {props.line.number ?? ''}
    </Text>
  );
}

function LineSign({ line }: LineProps): React.JSX.Element {
  const style = lineStyles[line.kind];
  return (
    <Text role="code" className={cn('w-5 shrink-0 text-center', style.color)}>
      {style.sign}
    </Text>
  );
}

function CodeLine(props: LineProps): React.JSX.Element {
  const { background } = lineStyles[props.line.kind];
  return (
    <View className={cn('h-5 flex-row items-center', background)}>
      <LineNumber {...props} />
      <LineSign {...props} />
      <Text role="code" className="shrink-0 pr-3 text-foreground" selectable>
        {props.line.text}
      </Text>
    </View>
  );
}

function DiffHunk({
  hunk,
  inline,
}: {
  hunk: Hunk;
  inline: boolean;
}): React.JSX.Element {
  return (
    <View>
      {withOccurrenceKeys(hunk.lines, lineKey).map(({ item: line, key }) => (
        <CodeLine key={key} line={line} inline={inline} />
      ))}
    </View>
  );
}

function HunkList({ hunks, inline }: HunksProps): React.JSX.Element {
  return (
    <View className="min-w-full">
      {withOccurrenceKeys(hunks, (hunk) => hunk.header).map(
        ({ item: hunk, key }) => (
          <DiffHunk key={key} hunk={hunk} inline={inline} />
        ),
      )}
    </View>
  );
}

function VerticalScroll(props: {
  inline: boolean;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <ScrollView
      className={props.inline ? 'max-h-75 wide:max-h-100' : undefined}
      scrollEnabled={props.inline}
      testID="diff-scroll"
    >
      {props.children}
    </ScrollView>
  );
}

export function DiffScroll(props: HunksProps): React.JSX.Element {
  return (
    <VerticalScroll inline={props.inline}>
      <ScrollView
        horizontal
        className="min-w-0 grow-0 shrink-0"
        contentContainerClassName="min-w-full"
      >
        <HunkList {...props} />
      </ScrollView>
    </VerticalScroll>
  );
}
