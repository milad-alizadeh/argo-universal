import type * as React from 'react';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Button } from '#lib/generic/primitives/button';
import {
  Collapsible,
  CollapsibleContent,
} from '#lib/generic/primitives/collapsible';
import { Text, TextClassContext } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { CodeBlockHeader } from '#lib/product/markdown/code-block-header';
import { CopyButton } from '#lib/product/markdown/copy-button';
import type { DiffLine, FileDiff } from '../view/file-diff';
import { DisclosureCaret } from './disclosure-caret';

export interface DiffViewProps {
  file: FileDiff;
  inline?: boolean;
}

const previewLineCount = 5;
const lineStyles = {
  context: { color: 'text-ring', sign: ' ' },
  added: { color: 'text-success', sign: '+' },
  removed: { color: 'text-destructive', sign: '-' },
  note: { color: 'text-ring', sign: ' ' },
};

function CodeLine({
  line,
  inline,
}: {
  line: DiffLine;
  inline: boolean;
}): React.JSX.Element {
  return (
    <View
      className={cn(
        'h-5 flex-row items-center',
        line.kind === 'added' && 'bg-success/10',
        line.kind === 'removed' && 'bg-destructive/10',
      )}
    >
      <Text
        role="code"
        className={cn(
          'shrink-0 text-right',
          lineStyles[line.kind].color,
          inline ? 'w-7' : 'w-9',
        )}
      >
        {line.number ?? ''}
      </Text>
      <Text
        role="code"
        className={cn('w-5 shrink-0 text-center', lineStyles[line.kind].color)}
      >
        {line.kind === 'removed' ? '\u2212' : lineStyles[line.kind].sign}
      </Text>
      <Text role="code" className="shrink-0 pr-3 text-foreground" selectable>
        {line.text}
      </Text>
    </View>
  );
}

// The Inspector's file header: folder muted, file name strong, then copy and the change counts.
function FileHeader({
  file,
  open,
  onOpenChange,
}: {
  file: FileDiff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const slash = file.path.lastIndexOf('/');
  const folder = file.path.slice(0, slash + 1);
  const name = file.path.slice(slash + 1);
  return (
    <View className="h-9 flex-row items-center gap-2 bg-muted pr-3 pl-2">
      <Button
        variant="link"
        className="h-5 min-w-0 flex-1 justify-start gap-2 rounded-none p-0 sm:h-5 has-[>[data-icon]]:px-0"
        aria-label={`Diff for ${file.path}`}
        aria-expanded={open}
        onPress={() => onOpenChange(!open)}
      >
        <TextClassContext.Provider value="select-none no-underline">
          <DisclosureCaret open={open} />
          <View className="min-w-0 flex-1 flex-row items-center overflow-hidden">
            <Text
              selectable={false}
              numberOfLines={1}
              ellipsizeMode="head"
              role="code"
              className="min-w-0 shrink text-muted-foreground web:[direction:rtl] web:text-left"
            >
              {Platform.OS === 'web' ? `\u2066${folder}\u2069` : folder}
            </Text>
            <Text
              selectable={false}
              numberOfLines={1}
              role="code"
              className="shrink-0 text-foreground"
            >
              {name}
            </Text>
          </View>
        </TextClassContext.Provider>
      </Button>
      <CopyButton value={file.path} label="Copy path" />
      {file.added > 0 && (
        <Text
          selectable={false}
          role="badge"
          className="select-none text-success"
        >
          +{file.added}
        </Text>
      )}
      {file.removed > 0 && (
        <Text
          selectable={false}
          role="badge"
          className="select-none text-destructive"
        >
          {`\u2212${file.removed}`}
        </Text>
      )}
    </View>
  );
}

// The same hunk rendering is used inline in the Feed and under a file header in the Inspector.
export function DiffView({
  file,
  inline = false,
}: DiffViewProps): React.JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(true);
  const patchText = file.hunks
    .map(
      (hunk) =>
        `${hunk.header}\n${hunk.lines.map((line) => `${line.kind === 'note' ? '' : lineStyles[line.kind].sign}${line.text}`).join('\n')}`,
    )
    .join('\n');
  const lineCount = file.hunks.reduce(
    (count, hunk) => count + hunk.lines.length,
    0,
  );
  const limited = inline && !showAll && lineCount > previewLineCount;
  const visibleHunks = visibleLines(
    file.hunks,
    limited ? previewLineCount : lineCount,
  );
  return (
    <Collapsible
      open={open}
      className={cn(
        'min-w-0',
        Platform.select({ web: 'code-block' }),
        inline &&
          'overflow-hidden rounded-xl web:rounded-surface web:shadow-card border border-border',
      )}
      testID="diff-view"
    >
      {inline && <CodeBlockHeader title={file.path} copyValue={patchText} />}
      {!inline && <FileHeader file={file} open={open} onOpenChange={setOpen} />}
      <CollapsibleContent>
        <ScrollView
          className={inline ? 'max-h-75 wide:max-h-100' : undefined}
          scrollEnabled={inline}
          testID="diff-scroll"
        >
          <ScrollView
            horizontal
            className="min-w-0 grow-0 shrink-0"
            contentContainerClassName="min-w-full"
          >
            <View className="min-w-full">
              {withOccurrenceKeys(visibleHunks, (hunk) => hunk.header).map(
                ({ item: hunk, key }) => (
                  <View key={key}>
                    {withOccurrenceKeys(
                      hunk.lines,
                      (line) => `${line.kind}:${line.text}`,
                    ).map(({ item: line, key: lineKey }) => (
                      <CodeLine key={lineKey} line={line} inline={inline} />
                    ))}
                  </View>
                ),
              )}
            </View>
          </ScrollView>
        </ScrollView>
        {limited && (
          <Button
            variant="link"
            onPress={() => setShowAll(true)}
            className="h-6 sm:h-6 justify-start rounded-none border-t border-border bg-sidebar px-3 py-0"
          >
            <Text
              selectable={false}
              role="secondary"
              className="select-none no-underline group-hover:no-underline group-active:no-underline"
            >
              Show all {lineCount} lines
            </Text>
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function visibleLines(
  hunks: DiffViewProps['file']['hunks'],
  limit: number,
): DiffViewProps['file']['hunks'] {
  let remaining = limit;
  return hunks
    .map((hunk) => {
      const lines = hunk.lines.slice(0, remaining);
      remaining -= lines.length;
      return { ...hunk, lines };
    })
    .filter((hunk) => hunk.lines.length > 0);
}
