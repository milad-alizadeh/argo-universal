import { Text } from '@repo/kit/primitives/content/text';
import { List } from '@repo/kit/primitives/lists/list';
import { useClock } from '@repo/kit/use-clock';
import { type JSX, useMemo } from 'react';
import { View } from 'react-native';
import type { ShellEntry, ShellOutputText } from './shell-list-types';
import { type ShellSpan, shellOutputLines } from './shell-output-lines';
import { CommandLine, DroppedLines, ExitLine } from './shell-output-parts';

export interface ShellOutputProps {
  shell: ShellEntry;
  output?: ShellOutputText;
  // Fixed time for stories and tests; a running Shell's time otherwise ticks.
  now?: number;
}

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

type LinesProps = ShellOutputProps & { lines: OutputLine[] };

// Output lines draw as a plain list that follows its end while the reader stays there: the List's end anchor owns that and Jump to latest. Short output stays at the top, as a terminal shows it.
const outputListProps = {
  testID: 'shell-output',
  anchor: 'end',
  alignItemsAtEnd: false,
  fit: false,
  renderItem: renderLine,
  keyExtractor: lineKey,
  padding: 4,
} as const;

function OutputLines({ lines, ...props }: LinesProps): JSX.Element {
  const now = useClock(props.shell.status === 'running', props.now);

  return (
    <List
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
  const lines = useOutputLines(ownOutput(props)?.text);

  return (
    <View className="flex-1">
      <CommandLine shell={props.shell} />
      <OutputLines {...props} lines={lines} />
    </View>
  );
}
