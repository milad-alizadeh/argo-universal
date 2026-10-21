import type { LegendListRef } from '@legendapp/list/react-native';
import { Text } from '@repo/kit/primitives/content/text';
import { List } from '@repo/kit/primitives/lists/list';
import { useClock } from '@repo/kit/use-clock';
import { type JSX, type RefObject, useMemo, useRef } from 'react';
import { View } from 'react-native';
import {
  JumpToLatestButton,
  useNewestKeyWhenLeftEnd,
} from '#lib/product/jump-to-latest';
import type { ShellEntry, ShellOutputText } from './shell-list-types';
import { type ShellSpan, shellOutputLines } from './shell-output-lines';
import { CommandLine, DroppedLines, ExitLine } from './shell-output-parts';

export interface ShellOutputProps {
  shell: ShellEntry;
  output?: ShellOutputText;
  // Fixed time for stories and tests; a running Shell's time otherwise ticks.
  now?: number;
}

type ListRef = RefObject<LegendListRef | null>;

type KeyedSpan = ShellSpan & { key: string };

interface OutputLine {
  key: string;
  spans: KeyedSpan[];
}

const lineKey = (line: OutputLine): string => line.key;

// Lines and spans keyed by their place, so a growing output keeps the lines already drawn.
const keyedLine = (spans: ShellSpan[], line: number): OutputLine => ({
  key: String(line),
  spans: spans.map((span, at) => ({ ...span, key: `${line}:${at}` })),
});

function useOutputLines(text: string | undefined): OutputLine[] {
  return useMemo(() => shellOutputLines(text ?? '').map(keyedLine), [text]);
}

// Output loaded for another Shell is not yet this one's.
const ownOutput = ({
  output,
  shell,
}: ShellOutputProps): ShellOutputText | undefined =>
  output?.shellId === shell.id ? output : undefined;

const drawnSpan = (span: KeyedSpan): JSX.Element => (
  <Text key={span.key} role="secondary-code" tone={span.tone}>
    {span.text}
  </Text>
);

// An empty line keeps a line's height, as a terminal's does.
function OutputRow({ line }: { line: OutputLine }): JSX.Element {
  return (
    <Text role="secondary-code" selectable>
      {line.spans.length === 0 ? ' ' : line.spans.map(drawnSpan)}
    </Text>
  );
}

const renderLine = (line: OutputLine): JSX.Element => <OutputRow line={line} />;

type JumpProps = { list: ListRef; newestKey: string };

// Shown while the reader is away from the end; the dot marks output that arrived since.
function JumpToLatest({ list, newestKey }: JumpProps): JSX.Element | null {
  const leftEndAt = useNewestKeyWhenLeftEnd(list, newestKey);

  if (leftEndAt === null) return null;

  return (
    <View className="pointer-events-box-none absolute inset-x-0 bottom-7 items-center">
      <JumpToLatestButton
        hasNewRows={leftEndAt !== newestKey}
        onPress={() => void list.current?.scrollToEnd({ animated: true })}
      />
    </View>
  );
}

type LinesProps = ShellOutputProps & { list: ListRef; lines: OutputLine[] };

// Output lines draw as a plain list that follows its end while the reader stays there.
const outputListProps = {
  testID: 'shell-output',
  // Opens on the newest output, as a terminal shows it.
  initialScrollAtEnd: true,
  fit: false,
  renderItem: renderLine,
  keyExtractor: lineKey,
  padding: 4,
  // New lines, a resized sheet, a line that wraps on measuring and the exit line all keep a reader at the end there (LegendList `MaintainScrollAtEndOnOptions`).
  maintainScrollAtEnd: {
    on: {
      dataChange: true,
      layout: true,
      itemLayout: true,
      footerLayout: true,
    },
  },
} as const;

function OutputLines({ list, lines, ...props }: LinesProps): JSX.Element {
  const now = useClock(props.shell.status === 'running', props.now);

  return (
    <List
      ref={list}
      {...outputListProps}
      accessibilityLabel={`${props.shell.command} output`}
      items={lines}
      header={<DroppedLines count={ownOutput(props)?.droppedLines} />}
      endContent={<ExitLine shell={props.shell} now={now} />}
    />
  );
}

// A Shell's output as its terminal coloured it, following the end while the reader stays there.
export function ShellOutput(props: ShellOutputProps): JSX.Element {
  const list = useRef<LegendListRef>(null);
  const lines = useOutputLines(ownOutput(props)?.text);

  return (
    <View className="flex-1">
      <CommandLine shell={props.shell} />
      <OutputLines {...props} list={list} lines={lines} />
      <JumpToLatest list={list} newestKey={String(lines.length)} />
    </View>
  );
}
