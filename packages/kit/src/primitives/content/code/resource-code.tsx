import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { trayClassName } from '#kit/tray-surface';
import { cn } from '#kit/utils';
import { CodeBlockBody } from './code-block-body';
import { CodeBlockHeader, codeBlockBarClassName } from './code-block-header';
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
  // A line under the code, such as a command's exit status, in a bar that matches the header.
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
      // A title of Argo's own heads a tool's output, under the row's own icon.
      icon={props.title === undefined}
    />
  );
}

function CodeBlockFooter({
  footer,
}: Pick<ResourceCodeProps, 'footer'>): ReactElement | null {
  return footer ? (
    <View className={codeBlockBarClassName}>{footer}</View>
  ) : null;
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
      <CodeBlockFooter footer={props.footer} />
    </CodeBlockFrame>
  );
}
