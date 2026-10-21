import type * as React from 'react';
import { type ReactNode, useMemo } from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#kit/occurrence-keys';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import { syntaxRunsText } from '../../../code-text/syntax-run';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import { syntaxRuns } from './code-highlight/syntax-runs';
import type { CodeProps } from './code-props';

type Hunk = NonNullable<CodeProps['diff']>[number];

type DiffLine = Hunk['lines'][number];

import { lineStyles } from './diff-lines';

interface HunksProps {
  hunks: readonly Hunk[];
  inline: boolean;
  // The file the hunks came from, whose extension decides the syntax colours.
  path?: string;
}

interface LineProps {
  line: DiffLine;
  inline: boolean;
  path?: string;
}

const lineNumberClassName = ({ inline }: LineProps): string =>
  cn('shrink-0 text-right', 'text-tertiary', inline ? 'w-7' : 'w-9');

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

/*
 * A hunk's lines are separate rows, so each is coloured on its own. A construct that runs past the
 * end of a line, such as a block comment, keeps its colour only as far as that line goes.
 */
function LineText({ line, path }: LineProps): React.JSX.Element {
  const runs = useMemo(() => syntaxRuns(line.text, path), [line.text, path]);

  return (
    <Text
      role="code"
      testID="diff-line"
      className={cn('shrink-0 pr-3', lineStyles[line.kind].color)}
      selectable
    >
      {runs === undefined ? line.text : syntaxRunsText(runs)}
    </Text>
  );
}

function CodeLine(props: LineProps): React.JSX.Element {
  const { background } = lineStyles[props.line.kind];

  return (
    <View className={cn('h-5 flex-row items-center', background)}>
      <LineNumber {...props} />
      <LineSign {...props} />
      <LineText {...props} />
    </View>
  );
}

function DiffHunk({
  hunk,
  inline,
  path,
}: {
  hunk: Hunk;
} & Omit<HunksProps, 'hunks'>): React.JSX.Element {
  return (
    <View>
      {withOccurrenceKeys(hunk.lines, lineKey).map(({ item: line, key }) => (
        <CodeLine key={key} line={line} inline={inline} path={path} />
      ))}
    </View>
  );
}

function HunkList({ hunks, inline, path }: HunksProps): React.JSX.Element {
  return (
    <View className="min-w-full gap-6">
      {withOccurrenceKeys(hunks, (hunk) => hunk.header).map(
        ({ item: hunk, key }) => (
          <DiffHunk key={key} hunk={hunk} inline={inline} path={path} />
        ),
      )}
    </View>
  );
}

function VerticalScroll(props: {
  inline: boolean;
  children: ReactNode;
}): React.JSX.Element {
  const scroll = {
    fitContent: true,
    scrollEnabled: props.inline,
    testID: 'diff-scroll',
    className: props.inline ? 'max-h-75 wide:max-h-100' : undefined,
    surfaceClassName: 'bg-card',
  };

  return <ScrollFadeView {...scroll}>{props.children}</ScrollFadeView>;
}

export function DiffScroll(props: HunksProps): React.JSX.Element {
  return (
    <VerticalScroll inline={props.inline}>
      <ScrollFadeView
        horizontal
        surfaceClassName={props.inline ? 'bg-card' : 'bg-content'}
        className="min-w-0 grow-0 shrink-0"
        contentContainerClassName="min-w-full"
      >
        <HunkList {...props} />
      </ScrollFadeView>
    </VerticalScroll>
  );
}
