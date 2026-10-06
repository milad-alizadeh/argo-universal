import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Collapsible, CollapsibleContent } from '#primitives/collapsible';
import { Text, TextClassContext } from '#primitives/text';
import type { DiffLine, FileDiff } from '../feed/file-diff';
import { CodeBlockHeader } from './CodeBlockHeader';
import { DisclosureCaret } from './DisclosureCaret';

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

function CodeLine({ line, inline }: { line: DiffLine; inline: boolean }) {
  return (
    <View
      className={cn(
        'h-5 flex-row items-center',
        line.kind === 'added' && 'bg-success/10',
        line.kind === 'removed' && 'bg-destructive/10',
      )}
    >
      <Text
        className={cn(
          'shrink-0 text-right font-mono text-xs leading-5',
          lineStyles[line.kind].color,
          inline ? 'w-7' : 'w-9',
        )}
      >
        {line.number ?? ''}
      </Text>
      <Text
        className={cn(
          'w-5 shrink-0 text-center font-mono text-xs leading-5',
          lineStyles[line.kind].color,
        )}
      >
        {lineStyles[line.kind].sign}
      </Text>
      <Text
        className="shrink-0 pr-3 font-mono text-xs leading-5 text-foreground"
        selectable
      >
        {line.text}
      </Text>
    </View>
  );
}

// The same hunk rendering is used inline in the Feed and under a file header in the Inspector.
export function DiffView({ file, inline = false }: DiffViewProps) {
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
  let remaining = limited ? previewLineCount : lineCount;
  const visibleHunks = file.hunks
    .map((hunk) => {
      const lines = hunk.lines.slice(0, remaining);
      remaining -= lines.length;
      return { ...hunk, lines };
    })
    .filter((hunk) => hunk.lines.length > 0);
  return (
    <Collapsible
      open={open}
      className={cn(
        'min-w-0',
        Platform.select({ web: 'code-block' }),
        inline && 'overflow-hidden rounded-xl border border-border',
      )}
      testID="diff-view"
    >
      {inline && <CodeBlockHeader title={file.path} code={patchText} />}
      {!inline && (
        <View className="h-9 flex-row items-center gap-2 border-b border-border bg-muted pr-3 pl-2">
          <Button
            variant="link"
            className="h-5 max-w-full shrink justify-start gap-2 rounded-none p-0 sm:h-5 has-[>svg]:px-0"
            aria-label={`Diff for ${file.path}`}
            aria-expanded={open}
            onPress={() => setOpen(!open)}
          >
            <TextClassContext.Provider value="select-none no-underline">
              <DisclosureCaret open={open} />
              <Text
                selectable={false}
                numberOfLines={1}
                className="min-w-0 shrink font-mono text-xs leading-4 text-foreground"
              >
                {file.path}
              </Text>
            </TextClassContext.Provider>
          </Button>
          <View className="flex-1" />
          <Text
            selectable={false}
            className="select-none font-mono text-xs font-normal leading-4 text-success"
          >
            +{file.added}
          </Text>
          <Text
            selectable={false}
            className="select-none font-mono text-xs font-normal leading-4 text-destructive"
          >
            -{file.removed}
          </Text>
        </View>
      )}
      <CollapsibleContent>
        <ScrollView className="max-h-75 wide:max-h-100" testID="diff-scroll">
          <ScrollView
            horizontal
            className="min-w-0 grow-0 shrink-0"
            contentContainerClassName="min-w-full"
          >
            <View className="min-w-full">
              {visibleHunks.map((hunk, index) => (
                <View key={`${hunk.header}-${index}`}>
                  {hunk.lines.map((line, lineIndex) => (
                    <CodeLine
                      key={`${lineIndex}-${line.kind}`}
                      line={line}
                      inline={inline}
                    />
                  ))}
                </View>
              ))}
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
              className="select-none text-sm font-normal leading-5 text-muted-foreground no-underline group-hover:no-underline group-active:no-underline"
            >
              Show all {lineCount} lines
            </Text>
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
