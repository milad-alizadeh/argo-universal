import type * as React from 'react';
import type { ReactNode } from 'react';
import { cn } from '#lib/generic/utils';
import {
  CodeBlockHeader,
  codeBlockTray,
} from '#lib/product/markdown/code-block-header';
import { codeBlockGroup } from '#lib/product/markdown/copy-button';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import {
  Collapsible,
  CollapsibleContent,
} from '#primitives/layout/collapsible';
import { FileHeader } from './diff-file-header';
import { DiffScroll } from './diff-hunks';
import { patchText } from './diff-lines';
import {
  type DiffPreview,
  type DiffViewProps,
  type DiffViewState,
  useDiffViewState,
} from './diff-view-state';

export type { DiffViewProps } from './diff-view-state';

const showAllClassName = contentActionClass({
  variant: 'link',
  className: 'h-6 sm:h-6 justify-start rounded-none bg-content px-3 py-0',
});

const showAllTextClassName =
  'select-none text-muted-foreground no-underline group-hover:no-underline group-active:no-underline';

function ShowAllLines(props: DiffPreview): React.JSX.Element | null {
  if (!props.limited) return null;

  return (
    <Pressable
      onPress={props.onShowAll}
      role="button"
      className={showAllClassName}
    >
      <Text selectable={false} className={showAllTextClassName}>
        Show all {props.lineCount} lines
      </Text>
    </Pressable>
  );
}

function DiffHeader(props: DiffViewState): React.JSX.Element {
  return props.inline ? (
    <CodeBlockHeader
      title={props.file.path}
      copyValue={patchText(props.file.hunks)}
    />
  ) : (
    <FileHeader {...props} />
  );
}

const diffClassName = (inline: boolean): string =>
  cn('min-w-0', codeBlockGroup, inline && codeBlockTray);

function DiffFrame(
  props: DiffViewState & { children: ReactNode },
): React.JSX.Element {
  return (
    <Collapsible
      open={props.open}
      className={diffClassName(props.inline)}
      testID="diff-view"
    >
      {props.children}
    </Collapsible>
  );
}

function diffContentClass(inline: boolean | undefined): string | undefined {
  return inline
    ? 'overflow-hidden rounded-xl bg-content'
    : 'bg-card py-2 medium:bg-content medium:py-0';
}

function DiffBody(view: DiffViewState): React.JSX.Element {
  return (
    <CollapsibleContent className={diffContentClass(view.inline)}>
      <DiffScroll
        hunks={view.preview.hunks}
        inline={view.inline}
        path={view.file.path}
      />
      <ShowAllLines {...view.preview} />
    </CollapsibleContent>
  );
}

// The same hunk rendering is used inline in the Feed and under a file header in the Inspector.
export function DiffView(props: DiffViewProps): React.JSX.Element {
  const view = useDiffViewState(props);

  return (
    <DiffFrame {...view}>
      <DiffHeader {...view} />
      <DiffBody {...view} />
    </DiffFrame>
  );
}
