import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { trayClassName } from '#lib/generic/tray-surface';
import { cn } from '#lib/generic/utils';
import { CodeBlockBody } from './code-block-body';
import { CodeBlockHeader } from './code-block-header';
import {
  type CodeBlockSource,
  copyAction,
  headerTitle,
} from './code-block-source';
import { codeBlockGroup } from './copy-button';

export type ResourceCodeProps = {
  // What the fence is written in, which decides the highlighting; the header shows it when nothing else names the block.
  language?: string;
  // A heading of Argo's own, such as a command's "Shell" or a file's name, for a block that is not a plain fence.
  title?: string;
  footer?: ReactNode;
  textClassName?: string;
} & CodeBlockSource;

function CodeBlockFrame({ children }: { children: ReactNode }): ReactElement {
  return (
    <View className={cn(codeBlockGroup, trayClassName, 'cursor-auto')}>
      {children}
    </View>
  );
}

function SourceHeader(props: ResourceCodeProps): ReactElement {
  const copy = copyAction(props);

  return (
    <CodeBlockHeader
      title={headerTitle(props)}
      copyValue={copy.value}
      copyLabel={copy.label}
      resource={props.resource}
    />
  );
}

// Code and supplied resources share one header, Copy control and scrolling body.
export function ResourceCode(props: ResourceCodeProps): ReactElement {
  return (
    <CodeBlockFrame>
      <SourceHeader {...props} />
      <CodeBlockBody
        code={props.code}
        description={props.description}
        language={props.language}
        textClassName={props.textClassName}
      />
      {props.footer}
    </CodeBlockFrame>
  );
}
