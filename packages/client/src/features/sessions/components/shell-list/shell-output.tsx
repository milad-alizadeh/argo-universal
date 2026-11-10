import { withOccurrenceKeys } from '@repo/kit/occurrence-keys';
import { Text } from '@repo/kit/primitives/content/text';
import { List } from '@repo/kit/primitives/lists/list';
import { type JSX, memo, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { shellTitle } from './shell-format';
import type {
  ShellEntry,
  ShellOutputSource,
  ShellOutputText,
} from './shell-list-types';
import type { ShellLine } from './shell-output-lines';
import { CommandLine, DroppedLines, ExitLine } from './shell-output-parts';
import { type OutputRow, useOutputRows } from './use-output-rows';

export interface ShellOutputProps {
  shell: ShellEntry;
  output?: ShellOutputText;
  // Output as it arrives, read here so a chunk renders this view alone. When given, it wins over `output`.
  outputSource?: ShellOutputSource;
  // Fixed time for stories and tests; a running Shell's time otherwise ticks.
  now?: number;
}

const rowKey = (row: OutputRow): string => row.key;

type ShownText = Pick<ShellOutputText, 'text' | 'droppedLines'>;

const noOutput: ShownText = { text: '' };

// Output loaded for another Shell is not yet this one's.
const ownOutput = (
  output: ShellOutputText | undefined,
  shell: ShellEntry,
): ShownText => (output?.shellId === shell.id ? output : noOutput);

const drawnSpans = (spans: ShellLine): JSX.Element[] =>
  withOccurrenceKeys(spans, (span) => span.text).map(({ item, key }) => (
    <Text key={key} role="secondary-code" tone={item.tone}>
      {item.text}
    </Text>
  ));

// An empty line keeps a line's height, as a terminal's does. A row redraws only when its line changed.
const OutputLine = memo(function OutputLine({
  row,
}: {
  row: OutputRow;
}): JSX.Element {
  return (
    <Text role="secondary-code" selectable>
      {row.spans.length === 0 ? ' ' : drawnSpans(row.spans)}
    </Text>
  );
});

const renderRow = (row: OutputRow): JSX.Element => <OutputLine row={row} />;

// Output lines draw as a plain list that follows its end while the reader stays there: the List's end anchor owns that and Jump to latest. Short output stays at the top, as a terminal shows it, and rows never load above, so nothing holds the scroll position as lines are measured.
const outputListProps = {
  testID: 'shell-output',
  anchor: 'end',
  alignItemsAtEnd: false,
  maintainVisibleContentPosition: false,
  fit: false,
  renderItem: renderRow,
  keyExtractor: rowKey,
  padding: 4,
} as const;

interface ShownProps {
  shell: ShellEntry;
  output?: ShellOutputText;
}

// Nothing here ticks: the exit line only shows once the Shell has ended, when its time is fixed.
function OutputLines({ shell, ...props }: ShownProps): JSX.Element {
  const output = ownOutput(props.output, shell);
  const rows = useOutputRows(output.text);

  return (
    <List
      {...outputListProps}
      accessibilityLabel={`${shellTitle(shell)} output`}
      items={rows}
      header={<DroppedLines count={output.droppedLines} />}
      endContent={<ExitLine shell={shell} />}
    />
  );
}

type SourcedProps = ShownProps & { source: ShellOutputSource };

// Output from a source re-renders the lines alone as it arrives.
function SourcedLines({ source, shell }: SourcedProps): JSX.Element {
  const output = useSyncExternalStore(source.subscribe, source.current);

  return <OutputLines shell={shell} output={output} />;
}

// A Shell's output as its terminal coloured it, following the end while the reader stays there.
export function ShellOutput(props: ShellOutputProps): JSX.Element {
  return (
    <View className="flex-1">
      <CommandLine shell={props.shell} />
      {props.outputSource ? (
        <SourcedLines shell={props.shell} source={props.outputSource} />
      ) : (
        <OutputLines shell={props.shell} output={props.output} />
      )}
    </View>
  );
}
