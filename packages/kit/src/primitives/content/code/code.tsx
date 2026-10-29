import type { ReactElement } from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { trayCardClassName, trayClassName } from '#kit/tray-surface';
import { Button } from '#primitives/actions/button';
import { CodeBlockBody } from './code-block-body';
import { CodeBlockHeader } from './code-block-header';
import type { CodeProps } from './code-props';
import { codeBlockGroup } from './copy-button';
import { DiffScroll } from './diff-hunks';
import {
  countLines,
  patchText,
  previewHunks,
  previewLineCount,
} from './diff-lines';

// Foundations / Code: fences, snippets and inline patches share one frame and Copy action.
export function Code(props: CodeProps): ReactElement {
  return (
    <View
      testID={props.diff ? 'diff-view' : undefined}
      className={`${codeBlockGroup} ${trayClassName}`}
    >
      {/* An inline patch sits under its edit row, which already shows the file's icon. */}
      <CodeBlockHeader
        title={codeTitle(props)}
        copyValue={copyValue(props)}
        icon={!props.diff}
      />
      <CodeContent {...props} />
    </View>
  );
}

function codeTitle(props: CodeProps): string {
  return props.path ?? props.language ?? '';
}

function copyValue(props: CodeProps): string {
  return props.diff ? patchText(props.diff) : props.code;
}

function CodeContent(props: CodeProps): ReactElement {
  if (props.diff) return <CodeDiff diff={props.diff} path={props.path} />;

  return (
    <CodeBlockBody code={props.code} language={props.language ?? props.path} />
  );
}

type DiffProps = { diff: NonNullable<CodeProps['diff']>; path?: string };

function CodeDiff({ diff, path }: DiffProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const count = countLines(diff);
  const limited = !expanded && count > previewLineCount;

  return (
    <DiffFrame>
      <DiffScroll hunks={previewHunks(diff, limited)} inline path={path} />
      {limited ? (
        <Button {...showAllProps(count, () => setExpanded(true))} />
      ) : null}
    </DiffFrame>
  );
}

function DiffFrame({ children }: { children: React.ReactNode }): ReactElement {
  return <View className={trayCardClassName}>{children}</View>;
}

function showAllProps(
  count: number,
  onPress: () => void,
): React.ComponentProps<typeof Button> {
  return { variant: 'text', label: `Show all ${count} lines`, onPress };
}
